import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createMeterReadingSchema } from '@/lib/validation/meter-reading';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['read'] });
  if (denied) return denied;

  const garageId = request.nextUrl.searchParams.get('garageId');
  let query = db.orm.public.MeterReading.where({ organizationId });
  if (garageId) query = query.where({ garageId });

  const items = await query.orderBy([(r) => r.readingDate.desc(), (r) => r.createdAt.desc()]).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['create'] });
  if (denied) return denied;

  const parsed = createMeterReadingSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);
  const data = parsed.data;

  const garage = await db.orm.public.Garage.where({ id: data.garageId, organizationId }).first();
  if (!garage) return jsonError(400, 'INVALID_GARAGE', 'Garage nicht gefunden.');

  const reading = await db.orm.public.MeterReading.create({
    ...data,
    value: data.value.toString(),
    organizationId,
  });
  return NextResponse.json(reading, { status: 201 });
}
