import { db } from '@/prisma/db';
import { billingError, type BillingResult } from './types';
import type { CreatePaymentInput } from '@/lib/validation/payment';

type Tx = { orm: typeof db.orm };
type Payment = Awaited<ReturnType<typeof db.orm.public.Payment.create>>;

// Records a payment and flips the invoice to 'paid' once payments cover
// grossAmount, or to 'partiallyPaid' once some but not all of it has been
// paid — the remaining balance itself is still derived as
// grossAmount - sum(payments) rather than stored; only the coarse
// open/partiallyPaid/paid status is persisted, so /rechnungen can show it in
// the list without an extra per-invoice Payment fetch. Overpayment is not
// guarded, same as before — this function has never capped totalPaid against
// grossAmount, and that permissiveness is kept for creditNote invoices too
// rather than tightened asymmetrically.
export async function recordPayment(
  tx: Tx,
  organizationId: string,
  invoiceId: string,
  input: CreatePaymentInput,
): Promise<BillingResult<Payment>> {
  const invoice = await tx.orm.public.Invoice.where({ id: invoiceId, organizationId }).first();
  if (!invoice) return billingError('NOT_FOUND', 'Rechnung nicht gefunden.');
  if (invoice.status === 'canceled') return billingError('INVOICE_CANCELED', 'Rechnung wurde storniert.');

  // A creditNote's grossAmount is negative — a Payment against it (a
  // "repayment", money paid back to the member) must be negative too;
  // anything else (consumption/membershipFee/custom) must be positive. This
  // guards against a wrong-sign payment silently corrupting the ledger (e.g.
  // a positive Payment on a creditNote would increase what the member owes
  // instead of repaying them).
  const expectedSign = invoice.type === 'creditNote' ? -1 : 1;
  if (Math.sign(input.amount) !== expectedSign) {
    return billingError(
      'INVALID_AMOUNT_SIGN',
      invoice.type === 'creditNote' ? 'Rückzahlungsbetrag muss negativ sein.' : 'Zahlungsbetrag muss positiv sein.',
    );
  }

  const payment = await tx.orm.public.Payment.create({
    organizationId,
    invoiceId,
    amount: input.amount,
    paidAt: input.paidAt ?? new Date(),
    method: input.method,
    note: input.note,
  });

  const payments = await tx.orm.public.Payment.where({ invoiceId, organizationId }).all();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Sign-and-magnitude comparison instead of a plain `totalPaid >=
  // grossAmount`: that check only works when grossAmount is positive — for a
  // negative-grossAmount creditNote it would flip to 'paid' the instant any
  // payment row exists (e.g. 0 >= -5000 is already true before any
  // repayment). Settled means totalPaid has reached the same sign and at
  // least the same magnitude as grossAmount.
  const isSettled =
    invoice.grossAmount === 0
      ? totalPaid === 0
      : Math.sign(totalPaid) === Math.sign(invoice.grossAmount) && Math.abs(totalPaid) >= Math.abs(invoice.grossAmount);

  const nextStatus = isSettled ? 'paid' : totalPaid !== 0 ? 'partiallyPaid' : invoice.status;
  if (nextStatus !== invoice.status) {
    await tx.orm.public.Invoice.where({ id: invoiceId, organizationId }).update({ status: nextStatus });
  }

  return { success: true, data: payment };
}
