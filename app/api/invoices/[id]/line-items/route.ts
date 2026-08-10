import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError } from '@/lib/api/responses';

type RouteParams = { params: Promise<{ id: string }> };

// Line items are created only by the billing engine (generate-membership-fee-
// invoice.ts / generate-custom-invoice.ts), never edited directly — this
// route is read-only, mirroring how Invoice itself has no free-form create.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const invoice = await db.orm.public.Invoice.where({ id, organizationId }).first();
  if (!invoice) return jsonError(404, 'NOT_FOUND', 'Rechnung nicht gefunden.');

  const items = await db.orm.public.InvoiceLineItem.where({ invoiceId: id, organizationId }).all();
  return NextResponse.json({ items });
}
