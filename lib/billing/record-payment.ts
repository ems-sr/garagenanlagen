import { db } from '@/prisma/db';
import { billingError, type BillingResult } from './types';
import type { CreatePaymentInput } from '@/lib/validation/payment';

type Tx = { orm: typeof db.orm };
type Payment = Awaited<ReturnType<typeof db.orm.public.Payment.create>>;

// Records a payment and flips the invoice to 'paid' once payments cover
// grossAmount — partial payments are supported and leave the invoice 'open',
// with the remaining balance derived as grossAmount - sum(payments) rather
// than stored.
export async function recordPayment(
  tx: Tx,
  organizationId: string,
  invoiceId: string,
  input: CreatePaymentInput,
): Promise<BillingResult<Payment>> {
  const invoice = await tx.orm.public.Invoice.where({ id: invoiceId, organizationId }).first();
  if (!invoice) return billingError('NOT_FOUND', 'Rechnung nicht gefunden.');
  if (invoice.status === 'canceled') return billingError('INVOICE_CANCELED', 'Rechnung wurde storniert.');

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

  if (totalPaid >= invoice.grossAmount && invoice.status !== 'paid') {
    await tx.orm.public.Invoice.where({ id: invoiceId, organizationId }).update({ status: 'paid' });
  }

  return { success: true, data: payment };
}
