import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { upsertAttributeAssignmentSchema } from '@/lib/validation/garage-attribute';
import { upsertAttributeAssignment } from '@/lib/garages/attribute-assignment';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const items = await db.orm.public.GarageAttributeAssignment.where({ garageId: id, organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['create'] });
  if (denied) return denied;

  const { id } = await params;
  const parsed = upsertAttributeAssignmentSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await upsertAttributeAssignment(organizationId, id, parsed.data.attributeTypeId, parsed.data.value);
  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data, { status: 201 });
}
