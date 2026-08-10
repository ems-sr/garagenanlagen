import { db } from '@/prisma/db';
import { billingError, type BillingResult } from '@/lib/billing/types';
import { breakdownIntoDenominations, type DenominationBreakdownEntry } from '@/lib/cash/denomination-breakdown';

type Tx = { orm: typeof db.orm };
type ShiftParticipant = Awaited<ReturnType<typeof db.orm.public.ShiftParticipant.create>>;

export type RecordPayoutResult = { participant: ShiftParticipant; breakdown: DenominationBreakdownEntry[] };

// Reimbursement is paid out once in full — no partial-payout concept, unlike
// Invoice/Payment, so this just flips paidOut/paidOutAt rather than creating
// a child payment row. The denomination breakdown is derived on demand from
// the already-snapshotted reimbursementAmount, never persisted (same
// reasoning Stage 7 used for PDF reports: fully re-derivable, no side
// effect worth logging).
export async function recordPayout(
  tx: Tx,
  organizationId: string,
  participantId: string,
): Promise<BillingResult<RecordPayoutResult>> {
  const existing = await tx.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).first();
  if (!existing) return billingError('NOT_FOUND', 'Teilnahme nicht gefunden.');
  if (existing.paidOut) return billingError('ALREADY_PAID_OUT', 'Auszahlung wurde bereits vermerkt.');

  const participant = await tx.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).update({
    paidOut: true,
    paidOutAt: new Date(),
  });
  if (!participant) return billingError('NOT_FOUND', 'Teilnahme nicht gefunden.');

  return { success: true, data: { participant, breakdown: breakdownIntoDenominations(participant.reimbursementAmount) } };
}
