import { db } from '@/prisma/db';

export type FinancialReportFilters = { dateFrom: Date; dateTo: Date; facilityId?: string };

export type FinancialReportGroup = {
  type: string;
  status: string;
  count: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
};

export type FinancialReportResult = {
  filters: FinancialReportFilters;
  groups: FinancialReportGroup[];
  totals: { count: number; netAmount: number; vatAmount: number; grossAmount: number };
  paymentsTotal: { count: number; amount: number };
};

// dateFrom/dateTo are both inclusive calendar dates (matching a plain
// <input type="date"> pair in the UI) — internally widened to a [dateFrom,
// exclusiveEnd) range, mirroring lib/billing/invoice-number.ts's
// gte/lt year-boundary pattern.
function exclusiveEndOf(dateTo: Date): Date {
  const end = new Date(dateTo);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

// A facility filter narrows to that facility's consumption invoices only —
// membershipFee/custom invoices are club-wide (no facilityId) and are
// intentionally excluded once a specific facility is chosen, same rule
// app/(app)/rechnungen/page.tsx uses for the inverse (unscoped) case.
function isInFacilityScope(facilityId: string | null | undefined, filterFacilityId: string | undefined): boolean {
  if (!filterFacilityId) return true;
  return facilityId === filterFacilityId;
}

export async function assembleFinancialReport(organizationId: string, filters: FinancialReportFilters): Promise<FinancialReportResult> {
  const exclusiveEnd = exclusiveEndOf(filters.dateTo);

  const [allInvoices, allPayments] = await Promise.all([
    db.orm.public.Invoice.where({ organizationId }).all(),
    db.orm.public.Payment.where({ organizationId }).all(),
  ]);

  const invoiceById = new Map(allInvoices.map((invoice) => [invoice.id, invoice]));

  // "Billed in period": grouped by invoice type x status, keyed off
  // issueDate — distinct from payments received in the same period, which
  // may pay off invoices issued earlier.
  const invoicesInRange = allInvoices.filter(
    (invoice) =>
      invoice.issueDate >= filters.dateFrom &&
      invoice.issueDate < exclusiveEnd &&
      isInFacilityScope(invoice.facilityId, filters.facilityId),
  );

  const groupMap = new Map<string, FinancialReportGroup>();
  for (const invoice of invoicesInRange) {
    const key = `${invoice.type}:${invoice.status}`;
    const existing = groupMap.get(key) ?? { type: invoice.type, status: invoice.status, count: 0, netAmount: 0, vatAmount: 0, grossAmount: 0 };
    existing.count += 1;
    existing.netAmount += invoice.netAmount;
    existing.vatAmount += invoice.vatAmount;
    existing.grossAmount += invoice.grossAmount;
    groupMap.set(key, existing);
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => a.type.localeCompare(b.type) || a.status.localeCompare(b.status));

  const totals = groups.reduce(
    (acc, group) => ({
      count: acc.count + group.count,
      netAmount: acc.netAmount + group.netAmount,
      vatAmount: acc.vatAmount + group.vatAmount,
      grossAmount: acc.grossAmount + group.grossAmount,
    }),
    { count: 0, netAmount: 0, vatAmount: 0, grossAmount: 0 },
  );

  // "Collected in period": grouped by paidAt, cross-referenced to the
  // (unfiltered-by-date) invoice map so a payment on an invoice issued
  // outside the period still counts, but the facility scope still applies.
  const paymentsInRange = allPayments.filter((payment) => {
    if (payment.paidAt < filters.dateFrom || payment.paidAt >= exclusiveEnd) return false;
    const invoice = invoiceById.get(payment.invoiceId);
    return isInFacilityScope(invoice?.facilityId, filters.facilityId);
  });

  const paymentsTotal = paymentsInRange.reduce(
    (acc, payment) => ({ count: acc.count + 1, amount: acc.amount + payment.amount }),
    { count: 0, amount: 0 },
  );

  return { filters, groups, totals, paymentsTotal };
}
