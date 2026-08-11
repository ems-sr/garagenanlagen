import { db } from '@/prisma/db';
import { generateMembershipFeeInvoiceForMember } from './generate-membership-fee-invoice';
import type { BillingError } from './types';

type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;

export type BulkMembershipFeeInvoiceResult = {
  created: Invoice[];
  skipped: { clubMemberId: string; garageId?: string; error: BillingError }[];
};

// Bills every ClubMember with a MembershipPeriod overlapping [periodStart,
// periodEnd) — a member without an overlapping period (never joined, or
// already ended before the period) is skipped, not failed, so one member's
// state never blocks the batch.
//
// A member gets one invoice per garage assigned to them at any point during
// [periodStart, periodEnd) — not just currently-active assignments — so a
// member who moved out mid-year still gets a (prorated) invoice for the
// months they held the garage, rather than being silently dropped. Distinct
// (member, garage) pairs are enumerated here; generateMembershipFeeInvoice-
// ForMember itself re-resolves and merges the overlapping assignment
// range(s) for proration and invoice/line-item labeling. A member with no
// garage assigned at any point in the period is skipped entirely (NO_GARAGE)
// rather than falling back to a garage-less invoice. Each (member, garage)
// invoice attempt gets its own transaction, same isolation rationale as
// generate-bulk-invoices.ts.
export async function generateBulkMembershipFeeInvoices(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<BulkMembershipFeeInvoiceResult> {
  const [members, periods, assignments] = await Promise.all([
    db.orm.public.ClubMember.where({ organizationId }).all(),
    db.orm.public.MembershipPeriod.where({ organizationId }).all(),
    db.orm.public.GarageAssignment.where({ organizationId, type: 'member' }).all(),
  ]);

  const activeMemberIds = new Set(
    periods
      .filter((period) => period.startDate < periodEnd && (!period.endDate || period.endDate >= periodStart))
      .map((period) => period.clubMemberId),
  );

  const garageIdsByMember = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    if (!assignment.clubMemberId) continue;
    if (assignment.validFrom >= periodEnd || (assignment.validTo && assignment.validTo <= periodStart)) continue;
    const garageIds = garageIdsByMember.get(assignment.clubMemberId) ?? new Set<string>();
    garageIds.add(assignment.garageId);
    garageIdsByMember.set(assignment.clubMemberId, garageIds);
  }

  const created: Invoice[] = [];
  const skipped: { clubMemberId: string; garageId?: string; error: BillingError }[] = [];

  for (const member of members) {
    if (!activeMemberIds.has(member.id)) {
      skipped.push({
        clubMemberId: member.id,
        error: { code: 'NOT_ACTIVE_MEMBER', message: 'Mitglied war in diesem Zeitraum nicht aktiv.' },
      });
      continue;
    }

    const garageIds = garageIdsByMember.get(member.id) ?? new Set<string>();
    if (garageIds.size === 0) {
      skipped.push({
        clubMemberId: member.id,
        error: { code: 'NO_GARAGE', message: 'Mitglied hatte in diesem Zeitraum keine zugewiesene Garage.' },
      });
      continue;
    }

    for (const garageId of garageIds) {
      const result = await db.transaction((tx) =>
        generateMembershipFeeInvoiceForMember(tx, organizationId, member.id, garageId, periodStart, periodEnd),
      );

      if (result.success) {
        created.push(result.data);
      } else {
        skipped.push({ clubMemberId: member.id, garageId, error: result.error });
      }
    }
  }

  return { created, skipped };
}
