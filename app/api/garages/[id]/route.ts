import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateGarageSchema } from '@/lib/validation/garage';

type RouteParams = { params: Promise<{ id: string }> };
const UNIQUE_VIOLATION = '23505';

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const garage = await db.orm.public.Garage.where({ id, organizationId }).first();
  if (!garage) return jsonError(404, 'NOT_FOUND', 'Garage nicht gefunden.');

  return NextResponse.json(garage);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Garage.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Garage nicht gefunden.');

  const parsed = updateGarageSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);
  const data = parsed.data;

  const facilityId = data.facilityId ?? existing.facilityId;
  if (data.facilityId) {
    const facility = await db.orm.public.Facility.where({ id: facilityId, organizationId }).first();
    if (!facility) return jsonError(400, 'INVALID_FACILITY', 'Garagenanlage nicht gefunden.');
  }

  if (data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: data.constructionSectionId,
      organizationId,
      facilityId,
    }).first();
    if (!section) {
      return jsonError(400, 'INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  if (data.blockId) {
    const block = await db.orm.public.Block.where({ id: data.blockId, organizationId, facilityId }).first();
    if (!block) return jsonError(400, 'INVALID_BLOCK', 'Trakt gehört nicht zur angegebenen Garagenanlage.');
  }

  try {
    const garage = await db.orm.public.Garage.where({ id, organizationId }).update(data);
    return NextResponse.json(garage);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, 'DUPLICATE_NUMBER', 'Garagennummer ist in dieser Garagenanlage bereits vergeben.');
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Garage.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Garage nicht gefunden.');

  await db.orm.public.Garage.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'sqlState' in error && error.sqlState === UNIQUE_VIOLATION;
}
