import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { isForeignKeyViolation, jsonError, zodError } from '@/lib/api/responses';
import { updateFacilitySchema } from '@/lib/validation/facility';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const facility = await db.orm.public.Facility.where({ id, organizationId }).first();
  if (!facility) return jsonError(404, 'NOT_FOUND', 'Garagenanlage nicht gefunden.');

  return NextResponse.json(facility);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Facility.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Garagenanlage nicht gefunden.');

  const parsed = updateFacilitySchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const facility = await db.orm.public.Facility.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(facility);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Facility.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Garagenanlage nicht gefunden.');

  try {
    await db.orm.public.Facility.where({ id, organizationId }).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return jsonError(409, 'REFERENCED', 'Garagenanlage wird noch von Bauabschnitten, Trakten oder Garagen referenziert.');
    }
    throw error;
  }
}
