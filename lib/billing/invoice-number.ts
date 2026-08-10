import { db } from '@/prisma/db';

type Tx = { orm: typeof db.orm };

// Shared sequential 'RE-{year}-{seq}' numbering across every invoice type
// (consumption/membershipFee/custom) — one sequence per organization per
// year, not per type, so numbers stay gap-free and chronological regardless
// of which billing engine created the invoice.
export async function nextInvoiceNumber(tx: Tx, organizationId: string, referenceDate: Date): Promise<string> {
  const year = referenceDate.getFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const invoicesThisYear = await tx.orm.public.Invoice.where({ organizationId })
    .where((i) => i.issueDate.gte(yearStart))
    .where((i) => i.issueDate.lt(yearEnd))
    .all();

  const seq = invoicesThisYear.length + 1;
  return `RE-${year}-${String(seq).padStart(4, '0')}`;
}
