import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createConstructionSectionSchema } from '@/lib/validation/construction-section';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['read'] });
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get('facilityId');
  let query = db.orm.public.ConstructionSection.where({ organizationId });
  if (facilityId) query = query.where({ facilityId });

  const items = await query.all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['create'] });
  if (denied) return denied;

  const parsed = createConstructionSectionSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const facility = await db.orm.public.Facility.where({ id: parsed.data.facilityId, organizationId }).first();
  if (!facility) return jsonError(400, 'INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  const section = await db.orm.public.ConstructionSection.create({ ...parsed.data, organizationId });
  return NextResponse.json(section, { status: 201 });
}
