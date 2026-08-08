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
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  ...ownerAc.statements,
  member: ['create', 'read', 'update', 'delete'],
  garage: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete'],
});

const orgAdmin = ac.newRole({
  ...adminAc.statements,
  member: ['create', 'read', 'update', 'delete'],
  garage: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete'],
});

const orgMember = ac.newRole({
  ...memberAc.statements,
  member: ['read'],
  garage: ['read'],
  invoice: ['read'],
});

// Seed custom role proving the "Vorstand"/"Werkstatt-Team"-style functional
// role pattern from the Projektbeschreibung — full role catalogue is Stage 3+.
const vorstand = ac.newRole({
  member: ['read', 'update'],
  garage: ['read'],
  invoice: ['read'],
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
