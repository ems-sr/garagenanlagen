import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createPaymentSchema } from '@/lib/validation/payment';
import { recordPayment } from '@/lib/billing/record-payment';

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

  const items = await db.orm.public.Payment.where({ invoiceId: id, organizationId }).orderBy((p) => p.paidAt.desc()).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const parsed = createPaymentSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await db.transaction((tx) => recordPayment(tx, organizationId, id, parsed.data));

  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 409;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data, { status: 201 });
}
