import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { isForeignKeyViolation, jsonError, zodError } from '@/lib/api/responses';
import { updateGarageUserSchema } from '@/lib/validation/garage-user';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const garageUser = await db.orm.public.GarageUser.where({ id, organizationId }).first();
  if (!garageUser) return jsonError(404, 'NOT_FOUND', 'Garagennutzer nicht gefunden.');

  return NextResponse.json(garageUser);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.GarageUser.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Garagennutzer nicht gefunden.');

  const parsed = updateGarageUserSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const garageUser = await db.orm.public.GarageUser.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(garageUser);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.GarageUser.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Garagennutzer nicht gefunden.');

  try {
    await db.orm.public.GarageUser.where({ id, organizationId }).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return jsonError(409, 'REFERENCED', 'Garagennutzer wird noch von Garagenzuordnungen referenziert.');
    }
    throw error;
  }
}
