import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateInvoiceSchema } from '@/lib/validation/invoice';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const invoice = await db.orm.public.Invoice.where({ id, organizationId }).first();
  if (!invoice) return jsonError(404, 'NOT_FOUND', 'Rechnung nicht gefunden.');

  return NextResponse.json(invoice);
}

// Invoices are financial records — the only supported edit is canceling an
// unpaid one with no payments recorded yet. Amounts/periods/status=open|paid
// are derived by the billing engine, not directly settable (see
// lib/validation/invoice.ts).
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Invoice.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Rechnung nicht gefunden.');

  const parsed = updateInvoiceSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  if (existing.status === 'paid') {
    return jsonError(409, 'ALREADY_PAID', 'Bezahlte Rechnungen können nicht storniert werden.');
  }
  if (existing.status === 'canceled') {
    return jsonError(409, 'ALREADY_CANCELED', 'Rechnung ist bereits storniert.');
  }

  const payments = await db.orm.public.Payment.where({ invoiceId: id, organizationId }).all();
  if (payments.length > 0) {
    return jsonError(409, 'HAS_PAYMENTS', 'Rechnung mit erfassten Zahlungen kann nicht storniert werden.');
  }

  const invoice = await db.orm.public.Invoice.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(invoice);
}
