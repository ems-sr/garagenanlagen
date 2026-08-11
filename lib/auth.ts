import { betterAuth } from 'better-auth';
import { admin, organization } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc, ownerAc, memberAc } from 'better-auth/plugins/organization/access';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';

// Better Auth manages its own tables directly against Postgres (via `pg.Pool`,
// through `pnpm exec better-auth migrate`) rather than through the Prisma
// Next contract: Better Auth's `prismaAdapter` expects a classic
// `@prisma/client`-style delegate API (`db[model].findFirst(...)`,
// `.create(...)`, etc.), which Prisma Next's fluent `db.orm.<Model>.where().all()`
// builder does not provide. Domain models in `prisma/contract.prisma`
// reference these tables (e.g. `organizationId`) with plain indexed columns,
// not Prisma-level relations — see the note at the top of that file.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Stage 1 first-cut Dynamic Access Control statements: extend Better Auth's
// organization defaults with a couple of domain resources to prove the
// pattern. The full resource/action matrix across all modules is Stage 14.
// Note: the `member` statement key here is an AC permission resource,
// distinct from the Stage 2 `Member` Prisma Next model (a Vereinsmitglied
// business record) — same word, different namespace, no actual collision.
const statement = {
  ...defaultStatements,
  member: ['create', 'read', 'update', 'delete'],
  garage: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete'],
  // Vereins-Stammdaten (Anschrift, Bankverbindung, Kontakt, Vorstand) — kept
  // separate from `member` (Mitgliederverwaltung) so the two can be granted
  // independently.
  club: ['read', 'update'],
  // Stage 4: meter-reading data entry and price-per-kWh maintenance, kept
  // separate from `invoice` (billing/payment management) so the two can be
  // granted independently — e.g. a caretaker enters meter readings without
  // being able to generate or cancel invoices.
  meterReading: ['create', 'read', 'update', 'delete'],
  // Stage 5: Mitgliedsbeitrag rate maintenance, kept separate from `invoice`
  // for the same reason meterReading is — generating/canceling dues and
  // custom invoices stays gated by `invoice`, only setting the rate itself
  // needs this.
  membershipFee: ['create', 'read', 'update', 'delete'],
  // Stage 6: template management + sending/viewing correspondence. One
  // statement for both (unlike meterReading/invoice's split) since there's
  // no scenario here needing "can send emails but not manage templates" or
  // vice versa — templates only exist to be sent, sending only makes sense
  // with templates to pick from.
  correspondence: ['create', 'read', 'update', 'delete'],
  // Stage 7: PDF report export. Read-only by design — "generating" a report
  // is a read of existing data, there's no create/update/delete verb that
  // makes sense for it.
  report: ['read'],
  // Stage 7: document archive (upload/list/download/delete), kept separate
  // from `report` since the two are functionally independent.
  document: ['create', 'read', 'update', 'delete'],
  // Stage 8: shift definition, participant/hours entry, and cash payout
  // recording — kept separate from `workShiftRate` for the same reason
  // `meterReading`/`invoice` and `membershipFee`/`invoice` are split: rate
  // maintenance can be granted independently of day-to-day shift
  // coordination.
  workShift: ['create', 'read', 'update', 'delete'],
  // Stage 8: Aufwandsentschädigung (reimbursement) rate maintenance.
  workShiftRate: ['create', 'read', 'update', 'delete'],
  // Stage 9: user-defined equipment attribute type definitions and their
  // per-garage value assignments — one statement for both, same rationale
  // as `correspondence` (no scenario needing one without the other).
  garageAttribute: ['create', 'read', 'update', 'delete'],
  // Stage 9: garage usage-history log. Read-only plus create (staff can add
  // a manual note; system-generated assignment events are written
  // internally, not through a user-facing "update"/"delete" verb) — the log
  // is append-only, mirroring CorrespondenceLog's lack of an edit/delete API.
  garageUsageEvent: ['create', 'read'],
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  ...ownerAc.statements,
  member: ['create', 'read', 'update', 'delete'],
  garage: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete'],
  club: ['read', 'update'],
  meterReading: ['create', 'read', 'update', 'delete'],
  membershipFee: ['create', 'read', 'update', 'delete'],
  correspondence: ['create', 'read', 'update', 'delete'],
  report: ['read'],
  document: ['create', 'read', 'update', 'delete'],
  workShift: ['create', 'read', 'update', 'delete'],
  workShiftRate: ['create', 'read', 'update', 'delete'],
  garageAttribute: ['create', 'read', 'update', 'delete'],
  garageUsageEvent: ['create', 'read'],
});

const orgAdmin = ac.newRole({
  ...adminAc.statements,
  member: ['create', 'read', 'update', 'delete'],
  garage: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete'],
  club: ['read', 'update'],
  meterReading: ['create', 'read', 'update', 'delete'],
  membershipFee: ['create', 'read', 'update', 'delete'],
  correspondence: ['create', 'read', 'update', 'delete'],
  report: ['read'],
  document: ['create', 'read', 'update', 'delete'],
  workShift: ['create', 'read', 'update', 'delete'],
  workShiftRate: ['create', 'read', 'update', 'delete'],
  garageAttribute: ['create', 'read', 'update', 'delete'],
  garageUsageEvent: ['create', 'read'],
});

const orgMember = ac.newRole({
  ...memberAc.statements,
  member: ['read'],
  garage: ['read'],
  invoice: ['read'],
  club: ['read'],
  meterReading: ['read'],
  membershipFee: ['read'],
  correspondence: ['read'],
  report: ['read'],
  document: ['read'],
  workShift: ['read'],
  workShiftRate: ['read'],
  garageAttribute: ['read'],
  garageUsageEvent: ['read'],
});

// Seed custom role proving the "Vorstand"/"Werkstatt-Team"-style functional
// role pattern from the Projektbeschreibung — full role catalogue is Stage 3+.
// This is the role Stage 3's Vereins-Stammdaten screen expects to be able to
// edit club/Vorstand data.
const vorstand = ac.newRole({
  member: ['read', 'update'],
  garage: ['read'],
  invoice: ['create', 'read', 'update', 'delete'],
  club: ['read', 'update'],
  meterReading: ['create', 'read', 'update', 'delete'],
  membershipFee: ['create', 'read', 'update', 'delete'],
  correspondence: ['create', 'read', 'update', 'delete'],
  report: ['read'],
  document: ['create', 'read', 'update', 'delete'],
  workShift: ['create', 'read', 'update', 'delete'],
  workShiftRate: ['create', 'read', 'update', 'delete'],
  garageAttribute: ['create', 'read', 'update', 'delete'],
  garageUsageEvent: ['create', 'read'],
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : undefined,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      teams: {
        enabled: true,
      },
      dynamicAccessControl: {
        enabled: true,
      },
      ac,
      roles: {
        owner,
        admin: orgAdmin,
        member: orgMember,
        vorstand,
      },
    }),
    admin(),
    // Must be last: patches auth methods to set cookies via next/headers.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
