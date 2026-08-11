import { db } from '@/prisma/db';
import { billingError, type BillingResult } from './types';
import { nextInvoiceNumber } from './invoice-number';
import type { CreateCreditNoteInput } from '@/lib/validation/invoice';

type Tx = { orm: typeof db.orm };
type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;

const VAT_RATE = 19;

// Ad-hoc credit note (billing correction) issued to a member — same
// free-form line-item shape as generate-custom-invoice.ts, but every stored
// amount is NEGATED: a credit note is "a negative invoice" (see the
// InvoiceType doc comment in contract.prisma), reusing the same
// Invoice/InvoiceLineItem/Payment machinery rather than new tables. Staff
// enter POSITIVE euro amounts in the UI (nobody types a minus sign); this is
// the one place that negates them before storing. applyVat controls whether
// 19% VAT is added before negation — on by default since a correction
// usually corrects a VAT-bearing invoice; the separate deposit-refund credit
// note (lib/work-shifts/record-payout.ts) never applies VAT and does not go
// through this function, since ShiftParticipant.reimbursementAmount never
// carried VAT to begin with.
export async function generateCreditNote(
  tx: Tx,
  organizationId: string,
  input: CreateCreditNoteInput,
): Promise<BillingResult<Invoice>> {
  const member = await tx.orm.public.ClubMember.where({ id: input.clubMemberId, organizationId }).first();
  if (!member) return billingError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const now = new Date();
  const periodStart = input.periodStart ?? now;
  const periodEnd = input.periodEnd ?? now;

  const lineItems = input.lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: -item.unitPrice,
    netAmount: -Math.round(item.quantity * item.unitPrice),
  }));

  const netAmount = lineItems.reduce((sum, item) => sum + item.netAmount, 0);
  const vatAmount = input.applyVat ? Math.round((netAmount * VAT_RATE) / 100) : 0;
  const grossAmount = netAmount + vatAmount;

  const invoiceNumber = await nextInvoiceNumber(tx, organizationId, now);

  const invoice = await tx.orm.public.Invoice.create({
    organizationId,
    type: 'creditNote',
    clubMemberId: input.clubMemberId,
    invoiceNumber,
    description: input.description,
    periodStart,
    periodEnd,
    netAmount,
    vatRate: input.applyVat ? VAT_RATE : 0,
    vatAmount,
    grossAmount,
    status: 'open',
  });

  for (const item of lineItems) {
    await tx.orm.public.InvoiceLineItem.create({
      organizationId,
      invoiceId: invoice.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice,
      netAmount: item.netAmount,
    });
  }

  return { success: true, data: invoice };
}
