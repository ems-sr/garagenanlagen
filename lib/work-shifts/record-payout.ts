import { db } from '@/prisma/db';
import { billingError, type BillingResult } from '@/lib/billing/types';
import { breakdownIntoDenominations, type DenominationBreakdownEntry } from '@/lib/cash/denomination-breakdown';
import { nextInvoiceNumber } from '@/lib/billing/invoice-number';

type Tx = { orm: typeof db.orm };
type ShiftParticipant = Awaited<ReturnType<typeof db.orm.public.ShiftParticipant.create>>;

export type RecordPayoutResult = {
  participant: ShiftParticipant;
  breakdown: DenominationBreakdownEntry[];
  creditNoteInvoiceId: string;
};

// Reimbursement is paid out once in full — no partial-payout concept, unlike
// Invoice/Payment, so this just flips paidOut/paidOutAt. It ALSO now
// generates a creditNote Invoice ("Kautionsrückerstattung") for the
// reimbursed amount, plus a matching negative Payment recording the
// immediate full cash handout — so the payout leaves a proper trace on the
// member's ledger (lib/ledger/assemble-member-ledger.ts) instead of being a
// side channel only visible on the ShiftParticipant row. No VAT is applied:
// reimbursementAmount is a flat cash amount with no VAT math anywhere
// upstream in the work-shift flow, so reapplying VAT here would invent a tax
// treatment that was never charged. The Payment is created directly (not
// via lib/billing/record-payment.ts's recordPayment) since this is an
// internal same-transaction write representing a single already-settled
// event, not a call through the public payment-recording engine.
export async function recordPayout(
  tx: Tx,
  organizationId: string,
  participantId: string,
): Promise<BillingResult<RecordPayoutResult>> {
  const existing = await tx.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).first();
  if (!existing) return billingError('NOT_FOUND', 'Teilnahme nicht gefunden.');
  if (existing.paidOut) return billingError('ALREADY_PAID_OUT', 'Auszahlung wurde bereits vermerkt.');

  const workShift = await tx.orm.public.WorkShift.where({ id: existing.workShiftId, organizationId }).first();
  if (!workShift) return billingError('NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  const now = new Date();
  const amount = -existing.reimbursementAmount;
  const invoiceNumber = await nextInvoiceNumber(tx, organizationId, now);

  const creditNote = await tx.orm.public.Invoice.create({
    organizationId,
    type: 'creditNote',
    clubMemberId: existing.clubMemberId,
    invoiceNumber,
    description: `Kautionsrückerstattung – ${workShift.title}`,
    periodStart: workShift.date,
    periodEnd: workShift.date,
    netAmount: amount,
    vatRate: 0,
    vatAmount: 0,
    grossAmount: amount,
    status: 'paid',
    issueDate: now,
  });

  await tx.orm.public.InvoiceLineItem.create({
    organizationId,
    invoiceId: creditNote.id,
    description: 'Kautionsrückerstattung',
    quantity: '1',
    unitPrice: amount,
    netAmount: amount,
  });

  await tx.orm.public.Payment.create({
    organizationId,
    invoiceId: creditNote.id,
    amount,
    paidAt: now,
    method: 'cash',
    note: 'Bar ausgezahlt (Arbeitseinsatz-Kaution)',
  });

  const participant = await tx.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).update({
    paidOut: true,
    paidOutAt: now,
  });
  if (!participant) return billingError('NOT_FOUND', 'Teilnahme nicht gefunden.');

  return {
    success: true,
    data: {
      participant,
      breakdown: breakdownIntoDenominations(participant.reimbursementAmount),
      creditNoteInvoiceId: creditNote.id,
    },
  };
}
