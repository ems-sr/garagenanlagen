import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createPricePerKwhSchema } from '@/lib/validation/price-per-kwh';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['read'] });
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get('facilityId');
  let query = db.orm.public.PricePerKwh.where({ organizationId });
  if (facilityId) query = query.where({ facilityId });

  const items = await query.all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { meterReading: ['create'] });
  if (denied) return denied;

  const parsed = createPricePerKwhSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);
  const data = parsed.data;

  const facility = await db.orm.public.Facility.where({ id: data.facilityId, organizationId }).first();
  if (!facility) return jsonError(400, 'INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  const price = await db.orm.public.PricePerKwh.create({ ...data, organizationId });
  return NextResponse.json(price, { status: 201 });
}
