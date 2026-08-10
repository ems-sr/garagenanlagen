import { db } from '@/prisma/db';

export type MemberListFilters = { activeOnly?: boolean; facilityId?: string };

export type MemberListRow = {
  id: string;
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  garageNumbers: string[];
};

export type MemberListResult = {
  filters: MemberListFilters;
  rows: MemberListRow[];
};

// Reuses the active/inactive predicate from app/(app)/mitglieder/page.tsx
// (a MembershipPeriod with no endDate, or one that hasn't ended yet, counts
// as active) and the facility-targeting logic from
// lib/email/send-correspondence.ts's `facilityMembers` recipient mode (every
// ClubMember with an active `member`-type GarageAssignment to a garage in
// the given Facility).
export async function assembleMemberListReport(organizationId: string, filters: MemberListFilters): Promise<MemberListResult> {
  const [members, periods] = await Promise.all([
    db.orm.public.ClubMember.where({ organizationId }).all(),
    db.orm.public.MembershipPeriod.where({ organizationId }).all(),
  ]);

  const now = new Date();
  const activeMemberIds = new Set(
    periods.filter((period) => !period.endDate || period.endDate >= now).map((period) => period.clubMemberId),
  );

  let scopedMemberIds: Set<string> | undefined;
  const garageNumbersByMember = new Map<string, string[]>();

  if (filters.facilityId) {
    const [garages, assignments] = await Promise.all([
      db.orm.public.Garage.where({ organizationId, facilityId: filters.facilityId }).all(),
      db.orm.public.GarageAssignment.where({ organizationId, type: 'member' })
        .where((a) => a.validTo.isNull())
        .all(),
    ]);
    const garageById = new Map(garages.map((garage) => [garage.id, garage]));
    scopedMemberIds = new Set();
    for (const assignment of assignments) {
      const garage = garageById.get(assignment.garageId);
      if (!garage || !assignment.clubMemberId) continue;
      scopedMemberIds.add(assignment.clubMemberId);
      const list = garageNumbersByMember.get(assignment.clubMemberId) ?? [];
      list.push(garage.number);
      garageNumbersByMember.set(assignment.clubMemberId, list);
    }
  }

  const rows = members
    .filter((member) => !scopedMemberIds || scopedMemberIds.has(member.id))
    .filter((member) => !filters.activeOnly || activeMemberIds.has(member.id))
    .map((member) => ({
      id: member.id,
      name: `${member.firstName} ${member.lastName}`,
      street: member.street,
      postalCode: member.postalCode,
      city: member.city,
      email: member.email,
      phone: member.phone,
      active: activeMemberIds.has(member.id),
      garageNumbers: garageNumbersByMember.get(member.id) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { filters, rows };
}
