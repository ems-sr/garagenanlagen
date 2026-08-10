import { db } from '@/prisma/db';
import { billingError, type BillingResult } from './types';
import { nextInvoiceNumber } from './invoice-number';
import type { CreateCustomInvoiceInput } from '@/lib/validation/invoice';

type Tx = { orm: typeof db.orm };
type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;

const VAT_RATE = 19;

// Free-form invoicing beyond consumption/dues billing — any number of line
// items (description + quantity + unit price), summed into the invoice's
// net/vat/gross totals. periodStart/periodEnd default to today when omitted
// since the contract still requires them (custom invoices aren't tied to a
// billed period the way consumption/membershipFee invoices are).
export async function generateCustomInvoice(
  tx: Tx,
  organizationId: string,
  input: CreateCustomInvoiceInput,
): Promise<BillingResult<Invoice>> {
  const member = await tx.orm.public.ClubMember.where({ id: input.clubMemberId, organizationId }).first();
  if (!member) return billingError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const now = new Date();
  const periodStart = input.periodStart ?? now;
  const periodEnd = input.periodEnd ?? now;

  const lineItems = input.lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    netAmount: Math.round(item.quantity * item.unitPrice),
  }));

  const netAmount = lineItems.reduce((sum, item) => sum + item.netAmount, 0);
  const vatAmount = Math.round((netAmount * VAT_RATE) / 100);
  const grossAmount = netAmount + vatAmount;

  const invoiceNumber = await nextInvoiceNumber(tx, organizationId, now);

  const invoice = await tx.orm.public.Invoice.create({
    organizationId,
    type: 'custom',
    clubMemberId: input.clubMemberId,
    invoiceNumber,
    description: input.description,
    periodStart,
    periodEnd,
    netAmount,
    vatRate: VAT_RATE,
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
