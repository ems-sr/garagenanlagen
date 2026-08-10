import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updatePricePerKwhSchema } from '@/lib/validation/price-per-kwh';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const price = await db.orm.public.PricePerKwh.where({ id, organizationId }).first();
  if (!price) return jsonError(404, 'NOT_FOUND', 'Strompreis nicht gefunden.');

  return NextResponse.json(price);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.PricePerKwh.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Strompreis nicht gefunden.');

  const parsed = updatePricePerKwhSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const price = await db.orm.public.PricePerKwh.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(price);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.PricePerKwh.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Strompreis nicht gefunden.');

  await db.orm.public.PricePerKwh.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
