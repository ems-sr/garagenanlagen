import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError, isUniqueViolation } from '@/lib/api/responses';
import { updateAttributeTypeSchema } from '@/lib/validation/garage-attribute';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const attributeType = await db.orm.public.GarageAttributeType.where({ id, organizationId }).first();
  if (!attributeType) return jsonError(404, 'NOT_FOUND', 'Attributtyp nicht gefunden.');

  return NextResponse.json(attributeType);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.GarageAttributeType.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Attributtyp nicht gefunden.');

  const parsed = updateAttributeTypeSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  try {
    const attributeType = await db.orm.public.GarageAttributeType.where({ id, organizationId }).update(parsed.data);
    return NextResponse.json(attributeType);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, 'DUPLICATE_NAME', 'Ein Attributtyp mit diesem Namen existiert bereits.');
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.GarageAttributeType.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Attributtyp nicht gefunden.');

  await db.orm.public.GarageAttributeType.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
