import { db } from '@/prisma/db';
import { billingError, type BillingResult } from './types';
import { nextInvoiceNumber } from './invoice-number';

type Tx = { orm: typeof db.orm };
type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;

const VAT_RATE = 19;

// Bills a single ClubMember for the Mitgliedsbeitrag covering [periodStart,
// periodEnd) — one invoice per member per period, enforced by an
// application-level lookup (no DB constraint, mirroring how
// generate-invoice.ts checks currentReadingId up front for a clean error
// before relying on the unique constraint). Must run inside a transaction:
// it reads-then-writes (invoice-number sequencing, duplicate-period check).
export async function generateMembershipFeeInvoiceForMember(
  tx: Tx,
  organizationId: string,
  clubMemberId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<BillingResult<Invoice>> {
  const member = await tx.orm.public.ClubMember.where({ id: clubMemberId, organizationId }).first();
  if (!member) return billingError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const existingInvoices = await tx.orm.public.Invoice.where({
    organizationId,
    clubMemberId,
    type: 'membershipFee',
    periodStart,
    periodEnd,
  }).all();
  const existing = existingInvoices.find((i) => i.status !== 'canceled');
  if (existing) {
    return billingError('ALREADY_INVOICED', 'Für diesen Zeitraum wurde bereits eine Beitragsrechnung für dieses Mitglied erstellt.');
  }

  // No `or()` combinator available yet — filter in JS instead of trying to
  // express "validTo IS NULL OR validTo > date" as a single where() clause
  // (same workaround as generate-invoice.ts's PricePerKwh lookup).
  const fees = await tx.orm.public.MembershipFee.where({ organizationId }).all();
  const fee = fees.find((f) => f.validFrom <= periodStart && (!f.validTo || f.validTo > periodStart));
  if (!fee) return billingError('NO_FEE', 'Kein gültiger Mitgliedsbeitrag zum Beginn dieses Zeitraums hinterlegt.');

  const description = fee.description ?? 'Mitgliedsbeitrag';
  const netAmount = fee.amount;
  const vatAmount = Math.round((netAmount * VAT_RATE) / 100);
  const grossAmount = netAmount + vatAmount;

  const invoiceNumber = await nextInvoiceNumber(tx, organizationId, new Date());

  const invoice = await tx.orm.public.Invoice.create({
    organizationId,
    type: 'membershipFee',
    clubMemberId,
    invoiceNumber,
    description,
    periodStart,
    periodEnd,
    netAmount,
    vatRate: VAT_RATE,
    vatAmount,
    grossAmount,
    status: 'open',
  });

  await tx.orm.public.InvoiceLineItem.create({
    organizationId,
    invoiceId: invoice.id,
    description,
    quantity: '1',
    unitPrice: fee.amount,
    netAmount: fee.amount,
  });

  return { success: true, data: invoice };
}
