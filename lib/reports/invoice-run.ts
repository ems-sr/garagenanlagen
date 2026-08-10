import { db } from '@/prisma/db';

export type InvoiceRunFilters = { dateFrom: Date; dateTo: Date; facilityId?: string; type?: string };

export type InvoiceRunRow = {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  memberName: string;
  garageNumber: string | null;
  periodStart: Date;
  periodEnd: Date;
  issueDate: Date;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
};

export type InvoiceRunResult = {
  filters: InvoiceRunFilters;
  rows: InvoiceRunRow[];
  totals: { count: number; netAmount: number; vatAmount: number; grossAmount: number; paidCount: number; openCount: number };
};

function exclusiveEndOf(dateTo: Date): Date {
  const end = new Date(dateTo);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

// Same query/join shape as app/(app)/rechnungen/page.tsx: fetch flat,
// build id-keyed maps, join in JS (no `or()` combinator in the query
// builder). Unlike the /rechnungen list, this report isn't facility-scoped
// by default — an unset facilityId reports every invoice type org-wide, a
// set one narrows to that facility's consumption invoices (see
// lib/reports/financial-report.ts's isInFacilityScope for the same rule).
export async function assembleInvoiceRunReport(organizationId: string, filters: InvoiceRunFilters): Promise<InvoiceRunResult> {
  const exclusiveEnd = exclusiveEndOf(filters.dateTo);

  const [allInvoices, members, garages] = await Promise.all([
    db.orm.public.Invoice.where({ organizationId }).all(),
    db.orm.public.ClubMember.where({ organizationId }).all(),
    db.orm.public.Garage.where({ organizationId }).all(),
  ]);

  const memberById = new Map(members.map((member) => [member.id, member]));
  const garageById = new Map(garages.map((garage) => [garage.id, garage]));

  const invoices = allInvoices.filter((invoice) => {
    if (invoice.issueDate < filters.dateFrom || invoice.issueDate >= exclusiveEnd) return false;
    if (filters.facilityId && invoice.facilityId !== filters.facilityId) return false;
    if (filters.type && invoice.type !== filters.type) return false;
    return true;
  });

  const rows: InvoiceRunRow[] = invoices
    .map((invoice) => {
      const member = memberById.get(invoice.clubMemberId);
      const garage = invoice.garageId ? garageById.get(invoice.garageId) : undefined;
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        status: invoice.status,
        memberName: member ? `${member.firstName} ${member.lastName}` : '–',
        garageNumber: garage?.number ?? null,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        issueDate: invoice.issueDate,
        netAmount: invoice.netAmount,
        vatAmount: invoice.vatAmount,
        grossAmount: invoice.grossAmount,
      };
    })
    .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));

  const totals = rows.reduce(
    (acc, row) => ({
      count: acc.count + 1,
      netAmount: acc.netAmount + row.netAmount,
      vatAmount: acc.vatAmount + row.vatAmount,
      grossAmount: acc.grossAmount + row.grossAmount,
      paidCount: acc.paidCount + (row.status === 'paid' ? 1 : 0),
      openCount: acc.openCount + (row.status === 'open' ? 1 : 0),
    }),
    { count: 0, netAmount: 0, vatAmount: 0, grossAmount: 0, paidCount: 0, openCount: 0 },
  );

  return { filters, rows, totals };
}
