import { db } from '@/prisma/db';

export type LedgerInvoiceType = 'consumption' | 'membershipFee' | 'custom' | 'creditNote';

export type LedgerEntry =
  | {
      kind: 'invoice';
      date: Date;
      invoiceId: string;
      invoiceType: LedgerInvoiceType;
      invoiceNumber: string;
      invoiceStatus: 'open' | 'partiallyPaid' | 'paid' | 'canceled';
      description: string;
      amount: number;
      runningBalance: number;
    }
  | {
      kind: 'payment';
      date: Date;
      paymentId: string;
      invoiceId: string;
      invoiceType: LedgerInvoiceType;
      invoiceNumber: string;
      description: string;
      amount: number;
      // Raw, unmodified Payment.amount (same sign convention as
      // Invoice.grossAmount) — kept alongside the display-oriented `amount`
      // above (a debit/credit-style sign flip for the running balance) so
      // callers that need to feed PaymentManager's own totalPaid/remaining
      // math (which expects amounts in Payment's original stored sign) don't
      // have to un-flip it themselves.
      rawAmount: number;
      method: string | null;
      runningBalance: number;
    };

export type MemberLedgerResult = { entries: LedgerEntry[]; finalBalance: number };

// Chronological per-member account statement combining charged invoices
// (including credit notes, which are just negative-amount Invoices — see the
// InvoiceType doc comment in contract.prisma) and Payments (including
// repayments, negative-amount Payments against a creditNote). Same
// fetch-all-then-join-via-Map idiom as lib/reports/financial-report.ts, but
// scoped to one member instead of bucketed org-wide.
//
// balance = amount the member owes the club (positive) / amount the club
// owes the member (negative), applied in chronological order:
//   balance += invoice.grossAmount   (a charge increases it; a credit
//                                      note's negative grossAmount decreases
//                                      it)
//   balance += -payment.amount       (a normal positive payment decreases
//                                      it; a negative repayment increases it
//                                      back toward 0 — e.g. grossAmount
//                                      -5000 takes balance to -5000, a
//                                      matching -5000 repayment then adds
//                                      +5000 back, net 0)
//
// Canceled invoices are excluded: cancelInvoice only allows canceling an
// invoice with zero payments, so a canceled invoice never nets against
// anything — including its grossAmount would show the member owing money
// for a voided invoice.
export async function assembleMemberLedger(organizationId: string, clubMemberId: string): Promise<MemberLedgerResult> {
  const [invoices, allPayments] = await Promise.all([
    db.orm.public.Invoice.where({ organizationId, clubMemberId }).all(),
    db.orm.public.Payment.where({ organizationId }).all(),
  ]);

  const activeInvoices = invoices.filter((invoice) => invoice.status !== 'canceled');
  const invoiceById = new Map(activeInvoices.map((invoice) => [invoice.id, invoice]));
  const payments = allPayments.filter((payment) => invoiceById.has(payment.invoiceId));

  const rows: (LedgerEntry & { createdAt: Date })[] = [];

  for (const invoice of activeInvoices) {
    rows.push({
      kind: 'invoice',
      date: invoice.issueDate,
      invoiceId: invoice.id,
      invoiceType: invoice.type,
      invoiceNumber: invoice.invoiceNumber,
      invoiceStatus: invoice.status,
      description: invoice.description ?? '',
      amount: invoice.grossAmount,
      runningBalance: 0,
      createdAt: invoice.createdAt,
    });
  }

  for (const payment of payments) {
    const invoice = invoiceById.get(payment.invoiceId)!;
    rows.push({
      kind: 'payment',
      date: payment.paidAt,
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      invoiceType: invoice.type,
      invoiceNumber: invoice.invoiceNumber,
      description: payment.note ?? (payment.amount < 0 ? 'Rückzahlung' : 'Zahlung'),
      amount: -payment.amount,
      rawAmount: payment.amount,
      method: payment.method,
      runningBalance: 0,
      createdAt: payment.createdAt,
    });
  }

  // Primary sort key is the calendar day (UTC), not the raw timestamp:
  // paidAt is often entered via a date-only picker and lands at UTC
  // midnight, which would otherwise sort a same-day payment before the
  // invoice it pays (issueDate carries a real time-of-day from `now()`).
  // Same-day entries are tie-broken by createdAt — never user-editable, so
  // a payment's createdAt is always after its invoice's — keeping the
  // running balance correct on each line even for same-day activity.
  const dayKey = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  rows.sort((a, b) => dayKey(a.date) - dayKey(b.date) || a.createdAt.getTime() - b.createdAt.getTime());

  let balance = 0;
  for (const row of rows) {
    balance += row.amount;
    row.runningBalance = balance;
  }

  const entries: LedgerEntry[] = rows.map(({ createdAt: _createdAt, ...entry }) => entry);
  return { entries, finalBalance: balance };
}
