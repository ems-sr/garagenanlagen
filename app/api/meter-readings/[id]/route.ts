import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { isForeignKeyViolation, jsonError, zodError } from '@/lib/api/responses';
import { updateMeterReadingSchema } from '@/lib/validation/meter-reading';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const reading = await db.orm.public.MeterReading.where({ id, organizationId }).first();
  if (!reading) return jsonError(404, 'NOT_FOUND', 'Zählerstand nicht gefunden.');

  return NextResponse.json(reading);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.MeterReading.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Zählerstand nicht gefunden.');

  const parsed = updateMeterReadingSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);
  const { value, ...rest } = parsed.data;

  const reading = await db.orm.public.MeterReading.where({ id, organizationId }).update({
    ...rest,
    ...(value !== undefined ? { value: value.toString() } : {}),
  });
  return NextResponse.json(reading);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.MeterReading.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Zählerstand nicht gefunden.');

  try {
    await db.orm.public.MeterReading.where({ id, organizationId }).delete();
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return jsonError(409, 'REFERENCED_BY_INVOICE', 'Zählerstand ist bereits in einer Rechnung erfasst und kann nicht gelöscht werden.');
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
