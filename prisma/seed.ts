import 'dotenv/config';
import { Pool } from 'pg';
import { db } from './db';

// Better Auth's `organization` table isn't in the Prisma Next contract (see
// the header comment in contract.prisma), so this script reads it directly
// via a `pg.Pool`, mirroring lib/auth.ts's own connection. Seeding depends
// on at least one organization already existing — sign up and create a
// Verein through the app first (`pnpm dev`), then run this script.
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query<{ id: string; name: string }>(
    'select id, name from "organization" order by "createdAt" asc limit 1',
  );
  await pool.end();

  const organization = rows[0];
  if (!organization) {
    console.error(
      'No organization found. Sign up and create a Verein through the app (pnpm dev) first, then re-run `pnpm run db:seed`.',
    );
    process.exitCode = 1;
    return;
  }

  const organizationId = organization.id;
  console.log(`Seeding Stage 2 fixtures for organization "${organization.name}" (${organizationId})`);

  await db.orm.public.ClubProfile.upsert({
    create: {
      organizationId,
      street: 'Vereinsweg 1',
      postalCode: '12345',
      city: 'Musterstadt',
      bankIban: 'DE02120300000000202051',
      bankBic: 'BYLADEM1001',
      bankName: 'Musterbank',
      accountHolder: 'Garagenverein Musterstadt e.V.',
      contactEmail: 'verein@example.com',
      contactPhone: '+49 30 1234567',
    },
    update: {},
  });

  await db.orm.public.BoardMember.create({
    organizationId,
    fullName: 'Erika Vorsitz',
    role: 'Vorsitzende',
    email: 'erika.vorsitz@example.com',
    phone: '+49 30 2222221',
  });
  await db.orm.public.BoardMember.create({
    organizationId,
    fullName: 'Klaus Kasse',
    role: 'Kassierer',
    email: 'klaus.kasse@example.com',
    phone: '+49 30 2222222',
  });

  const facilityA = await db.orm.public.Facility.create({
    organizationId,
    name: 'Garagenanlage Nord',
    street: 'Nordring',
    houseNumber: '1',
    postalCode: '12345',
    city: 'Musterstadt',
  });
  const facilityB = await db.orm.public.Facility.create({
    organizationId,
    name: 'Garagenanlage Süd',
    street: 'Südweg',
    houseNumber: '2',
    postalCode: '12345',
    city: 'Musterstadt',
  });

  const section = await db.orm.public.ConstructionSection.create({
    organizationId,
    facilityId: facilityA.id,
    name: 'Bauabschnitt 1',
  });
  const blockUnderSection = await db.orm.public.Block.create({
    organizationId,
    facilityId: facilityA.id,
    constructionSectionId: section.id,
    name: 'Trakt A',
  });
  const blockDirect = await db.orm.public.Block.create({
    organizationId,
    facilityId: facilityA.id,
    name: 'Trakt B',
  });

  const garageWithMemberAndUser = await db.orm.public.Garage.create({
    organizationId,
    facilityId: facilityA.id,
    blockId: blockUnderSection.id,
    number: 'A-1',
    shortName: 'A1',
    type: 'single',
    meterNumber: 'Z-1001',
  });
  const garageTenantOnly = await db.orm.public.Garage.create({
    organizationId,
    facilityId: facilityA.id,
    blockId: blockDirect.id,
    number: 'B-1',
    shortName: 'B1',
    type: 'double',
    meterNumber: 'Z-1002',
  });
  await db.orm.public.Garage.create({
    organizationId,
    facilityId: facilityB.id,
    number: '1',
    type: 'single',
  });

  const memberActive = await db.orm.public.ClubMember.create({
    organizationId,
    firstName: 'Anna',
    lastName: 'Beispiel',
    street: 'Musterweg 3',
    postalCode: '12345',
    city: 'Musterstadt',
    email: 'anna.beispiel@example.com',
    phone: '+49 30 1111111',
  });
  const memberFormer = await db.orm.public.ClubMember.create({
    organizationId,
    firstName: 'Bernd',
    lastName: 'Muster',
    email: 'bernd.muster@example.com',
  });

  await db.orm.public.MembershipPeriod.create({
    organizationId,
    clubMemberId: memberActive.id,
    startDate: new Date('2020-01-01'),
  });
  await db.orm.public.MembershipPeriod.create({
    organizationId,
    clubMemberId: memberFormer.id,
    startDate: new Date('2015-01-01'),
    endDate: new Date('2023-12-31'),
  });

  const garageUser = await db.orm.public.GarageUser.create({
    organizationId,
    firstName: 'Clara',
    lastName: 'Nutzer',
    email: 'clara.nutzer@example.com',
  });
  const tenant = await db.orm.public.Tenant.create({
    organizationId,
    firstName: 'Dirk',
    lastName: 'Mieter',
    email: 'dirk.mieter@example.com',
  });

  // garageWithMemberAndUser: assigned to memberActive, actually used by garageUser.
  await db.orm.public.GarageAssignment.create({
    organizationId,
    garageId: garageWithMemberAndUser.id,
    type: 'member',
    clubMemberId: memberActive.id,
  });
  await db.orm.public.GarageAssignment.create({
    organizationId,
    garageId: garageWithMemberAndUser.id,
    type: 'user',
    garageUserId: garageUser.id,
  });

  // garageTenantOnly: rented directly by the club, no member in between.
  await db.orm.public.GarageAssignment.create({
    organizationId,
    garageId: garageTenantOnly.id,
    type: 'tenant',
    tenantId: tenant.id,
  });

  console.log('Seed complete.');
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
