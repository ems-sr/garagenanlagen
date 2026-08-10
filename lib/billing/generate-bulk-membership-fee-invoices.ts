import { db } from '@/prisma/db';
import { generateMembershipFeeInvoiceForMember } from './generate-membership-fee-invoice';
import type { BillingError } from './types';

type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;

export type BulkMembershipFeeInvoiceResult = {
  created: Invoice[];
  skipped: { clubMemberId: string; error: BillingError }[];
};

// Bills every ClubMember with a MembershipPeriod overlapping [periodStart,
// periodEnd) — a member without an overlapping period (never joined, or
// already ended before the period) is skipped, not failed, so one member's
// state never blocks the batch. Each member gets its own transaction, same
// isolation rationale as generate-bulk-invoices.ts.
export async function generateBulkMembershipFeeInvoices(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<BulkMembershipFeeInvoiceResult> {
  const [members, periods] = await Promise.all([
    db.orm.public.ClubMember.where({ organizationId }).all(),
    db.orm.public.MembershipPeriod.where({ organizationId }).all(),
  ]);

  const activeMemberIds = new Set(
    periods
      .filter((period) => period.startDate < periodEnd && (!period.endDate || period.endDate >= periodStart))
      .map((period) => period.clubMemberId),
  );

  const created: Invoice[] = [];
  const skipped: { clubMemberId: string; error: BillingError }[] = [];

  for (const member of members) {
    if (!activeMemberIds.has(member.id)) {
      skipped.push({
        clubMemberId: member.id,
        error: { code: 'NOT_ACTIVE_MEMBER', message: 'Mitglied war in diesem Zeitraum nicht aktiv.' },
      });
      continue;
    }

    const result = await db.transaction((tx) =>
      generateMembershipFeeInvoiceForMember(tx, organizationId, member.id, periodStart, periodEnd),
    );

    if (result.success) {
      created.push(result.data);
    } else {
      skipped.push({ clubMemberId: member.id, error: result.error });
    }
  }

  return { created, skipped };
}
