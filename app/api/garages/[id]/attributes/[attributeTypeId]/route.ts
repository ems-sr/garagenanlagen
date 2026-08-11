import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError } from '@/lib/api/responses';

type RouteParams = { params: Promise<{ id: string; attributeTypeId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['delete'] });
  if (denied) return denied;

  const { id, attributeTypeId } = await params;
  const existing = await db.orm.public.GarageAttributeAssignment.where({
    garageId: id,
    attributeTypeId,
    organizationId,
  }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Attributwert nicht gefunden.');

  await db.orm.public.GarageAttributeAssignment.where({ id: existing.id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
