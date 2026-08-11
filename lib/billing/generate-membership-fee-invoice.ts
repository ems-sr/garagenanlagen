import { db } from '@/prisma/db';
import { billingError, type BillingResult } from './types';
import { nextInvoiceNumber } from './invoice-number';

type Tx = { orm: typeof db.orm };
type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;
type LineItemType = Awaited<ReturnType<typeof db.orm.public.LineItemType.create>>;

const VAT_RATE = 19;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(value: Date): string {
  return value.toLocaleDateString('de-DE');
}

// Merges every `type=member` GarageAssignment for (clubMemberId, garageId)
// that overlaps [periodStart, periodEnd), clamped to that window — same
// overlap test MembershipPeriod filtering uses in generate-bulk-membership-
// fee-invoices.ts. A member who held the same garage across two disjoint
// assignments within the period (moved out, back in) gets both ranges
// summed for proration and both shown in the label below, rather than only
// the currently-active one — dropping the vacated stretch would silently
// overbill for the gap.
async function resolveAssignmentCoverage(
  tx: Tx,
  organizationId: string,
  clubMemberId: string,
  garageId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<BillingResult<{ start: Date; end: Date }[]>> {
  const assignments = await tx.orm.public.GarageAssignment.where({ organizationId, clubMemberId, garageId, type: 'member' }).all();

  const ranges = assignments
    .map((assignment) => ({
      start: assignment.validFrom > periodStart ? assignment.validFrom : periodStart,
      end: assignment.validTo && assignment.validTo < periodEnd ? assignment.validTo : periodEnd,
    }))
    .filter((range) => range.start < range.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (ranges.length === 0) {
    return billingError('NO_ASSIGNMENT', 'Keine Garagenzuweisung dieses Mitglieds für diesen Zeitraum gefunden.');
  }

  return { success: true, data: ranges };
}

// Full-period coverage is labeled with the invoiced year(s) ("2026", or
// "2025–2026" for a period spanning New Year's); partial coverage is
// labeled with the actual covered date range(s) instead, e.g. a garage
// assigned 01.03.–31.12. gets "01.03.2026 – 31.12.2026" rather than "2026" —
// this is the "state the time of assignment (if partial year) or year"
// label appended to the invoice/line-item description below.
function formatPeriodLabel(periodStart: Date, periodEnd: Date, coverage: { start: Date; end: Date }[], isFullPeriod: boolean): string {
  if (isFullPeriod) {
    const startYear = periodStart.getFullYear();
    const endYear = periodEnd.getFullYear();
    return startYear === endYear ? String(startYear) : `${startYear}–${endYear}`;
  }
  return coverage.map((range) => `${formatDate(range.start)} – ${formatDate(range.end)}`).join(', ');
}

// Resolves the effective-dated MembershipFee amount for periodStart — same
// "no `or()` combinator" JS-filter pattern generate-invoice.ts uses for
// PricePerKwh.
async function resolveMembershipFeeAmount(tx: Tx, organizationId: string, periodStart: Date): Promise<BillingResult<number>> {
  const fees = await tx.orm.public.MembershipFee.where({ organizationId }).all();
  const fee = fees.find((f) => f.validFrom <= periodStart && (!f.validTo || f.validTo > periodStart));
  if (!fee) return billingError('NO_FEE', 'Kein gültiger Mitgliedsbeitrag zum Beginn dieses Zeitraums hinterlegt.');
  return { success: true, data: fee.amount };
}

// Resolves the effective-dated WorkShiftDepositAmount for periodStart — the
// same rate a `fixed`-unit WorkShift reimbursement snapshots from (see
// lib/work-shifts/resolve-reimbursement-amount.ts), so the deposit charged
// here always matches what a member gets refunded for attending a shift.
async function resolveWorkShiftDepositAmount(tx: Tx, organizationId: string, periodStart: Date): Promise<BillingResult<number>> {
  const amounts = await tx.orm.public.WorkShiftDepositAmount.where({ organizationId }).all();
  const amount = amounts.find((a) => a.validFrom <= periodStart && (!a.validTo || a.validTo > periodStart));
  if (!amount) return billingError('NO_RATE', 'Kein gültiger Kautionsbetrag zum Beginn dieses Zeitraums hinterlegt.');
  return { success: true, data: amount.amount };
}

// Only the membership-fee-sourced line item is prorated pro rata temporis by
// days assigned vs. days in the invoiced period — a fixed deposit
// (workShiftDepositRate) or other fixed line item is charged in full
// regardless of how much of the year the garage was actually held.
async function resolveLineItemUnitPrice(
  tx: Tx,
  organizationId: string,
  lineItemType: LineItemType,
  overrideAmount: number | null,
  periodStart: Date,
): Promise<BillingResult<{ amount: number; prorate: boolean }>> {
  if (lineItemType.amountSource === 'membershipFeeRate') {
    const resolved = await resolveMembershipFeeAmount(tx, organizationId, periodStart);
    if (!resolved.success) return resolved;
    return { success: true, data: { amount: resolved.data, prorate: true } };
  }
  if (lineItemType.amountSource === 'workShiftDepositRate') {
    const resolved = await resolveWorkShiftDepositAmount(tx, organizationId, periodStart);
    if (!resolved.success) return resolved;
    return { success: true, data: { amount: resolved.data, prorate: false } };
  }

  const amount = overrideAmount ?? lineItemType.defaultAmount;
  if (amount == null) return billingError('NO_AMOUNT', `Kein Betrag für Rechnungsposten "${lineItemType.name}" hinterlegt.`);
  return { success: true, data: { amount, prorate: false } };
}

// Bills a single ClubMember for the Mitgliedsbeitrag covering [periodStart,
// periodEnd) for one specific garage — a member with several garages gets
// one invoice per garage (see generateBulkMembershipFeeInvoices, which loops
// over each of the member's garages assigned at any point during the
// period). Duplicate prevention is keyed on
// (clubMemberId, garageId, periodStart, periodEnd) — same application-level
// lookup pattern generate-invoice.ts uses for currentReadingId, now scoped
// per garage so each garage's invoice is independently idempotent. Must run
// inside a transaction: it reads-then-writes (invoice-number sequencing,
// duplicate-period check).
//
// If the garage assignment doesn't cover the full [periodStart, periodEnd)
// window (started after periodStart and/or ended before periodEnd), the
// membership-fee line item is prorated by days covered / days in the period
// and both the invoice description and that line item's description state
// the actual covered date range; a full-period assignment states the
// invoiced year(s) instead.
//
// If an InvoiceTemplate with invoiceType=membershipFee and autoGenerate=true
// exists, its line items drive generation (e.g. bundling the membership fee
// and the Arbeitseinsatz-Kaution into one invoice); otherwise falls back to
// the original single-line "Mitgliedsbeitrag" behavior so clubs that haven't
// configured a template keep working unchanged. The full line-item content
// is repeated on every garage's invoice — there is no per-member-only vs.
// per-garage split.
export async function generateMembershipFeeInvoiceForMember(
  tx: Tx,
  organizationId: string,
  clubMemberId: string,
  garageId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<BillingResult<Invoice>> {
  const member = await tx.orm.public.ClubMember.where({ id: clubMemberId, organizationId }).first();
  if (!member) return billingError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const garage = await tx.orm.public.Garage.where({ id: garageId, organizationId }).first();
  if (!garage) return billingError('NOT_FOUND', 'Garage nicht gefunden.');

  const existingInvoices = await tx.orm.public.Invoice.where({
    organizationId,
    clubMemberId,
    garageId,
    type: 'membershipFee',
    periodStart,
    periodEnd,
  }).all();
  const existing = existingInvoices.find((i) => i.status !== 'canceled');
  if (existing) {
    return billingError(
      'ALREADY_INVOICED',
      'Für diesen Zeitraum wurde bereits eine Beitragsrechnung für dieses Mitglied und diese Garage erstellt.',
    );
  }

  const coverageResult = await resolveAssignmentCoverage(tx, organizationId, clubMemberId, garageId, periodStart, periodEnd);
  if (!coverageResult.success) return coverageResult;
  const coverage = coverageResult.data;

  const totalDays = (periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY;
  const billedDays = coverage.reduce((sum, range) => sum + (range.end.getTime() - range.start.getTime()) / MS_PER_DAY, 0);
  const isFullPeriod = billedDays >= totalDays;
  const prorationFactor = totalDays > 0 ? Math.min(billedDays / totalDays, 1) : 1;
  const periodLabel = formatPeriodLabel(periodStart, periodEnd, coverage, isFullPeriod);

  const templates = await tx.orm.public.InvoiceTemplate.where({ organizationId, invoiceType: 'membershipFee', autoGenerate: true }).all();
  const template = templates[0];

  const lineItems: { description: string; quantity: number; unitPrice: number; netAmount: number }[] = [];

  if (template) {
    const templateLineItems = await tx.orm.public.InvoiceTemplateLineItem.where({ invoiceTemplateId: template.id, organizationId })
      .orderBy((li) => li.sortOrder.asc())
      .all();

    for (const templateLineItem of templateLineItems) {
      const lineItemType = await tx.orm.public.LineItemType.where({ id: templateLineItem.lineItemTypeId, organizationId }).first();
      if (!lineItemType) return billingError('NOT_FOUND', 'Rechnungsposten-Typ der Vorlage nicht gefunden.');

      const resolved = await resolveLineItemUnitPrice(tx, organizationId, lineItemType, templateLineItem.overrideAmount, periodStart);
      if (!resolved.success) return resolved;

      const quantity = Number(templateLineItem.quantity);
      const unitPrice = resolved.data.prorate ? Math.round(resolved.data.amount * prorationFactor) : resolved.data.amount;
      const description = resolved.data.prorate ? `${lineItemType.name} (${periodLabel})` : lineItemType.name;
      lineItems.push({
        description,
        quantity,
        unitPrice,
        netAmount: Math.round(quantity * unitPrice),
      });
    }
  } else {
    const fees = await tx.orm.public.MembershipFee.where({ organizationId }).all();
    const fee = fees.find((f) => f.validFrom <= periodStart && (!f.validTo || f.validTo > periodStart));
    if (!fee) return billingError('NO_FEE', 'Kein gültiger Mitgliedsbeitrag zum Beginn dieses Zeitraums hinterlegt.');

    const unitPrice = Math.round(fee.amount * prorationFactor);
    const description = `${fee.description ?? 'Mitgliedsbeitrag'} (${periodLabel})`;
    lineItems.push({ description, quantity: 1, unitPrice, netAmount: unitPrice });
  }

  const netAmount = lineItems.reduce((sum, item) => sum + item.netAmount, 0);
  const vatAmount = Math.round((netAmount * VAT_RATE) / 100);
  const grossAmount = netAmount + vatAmount;
  const description = template ? `${template.name} (${periodLabel})` : lineItems[0].description;

  const invoiceNumber = await nextInvoiceNumber(tx, organizationId, new Date());

  // facilityId is deliberately left unset (unlike type=consumption invoices):
  // membershipFee invoices stay club-wide/visible regardless of the selected
  // facility on /rechnungen (see the filter there), even though each now
  // carries a garageId — setting facilityId would hide a member's dues
  // invoice whenever a different facility is selected.
  const invoice = await tx.orm.public.Invoice.create({
    organizationId,
    type: 'membershipFee',
    clubMemberId,
    garageId,
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
