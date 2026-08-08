import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateGarageAssignmentSchema } from '@/lib/validation/garage-assignment';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const assignment = await db.orm.public.GarageAssignment.where({ id, organizationId }).first();
  if (!assignment) return jsonError(404, 'NOT_FOUND', 'Zuordnung nicht gefunden.');

  return NextResponse.json(assignment);
}

// PATCH only accepts { validTo } — closing an assignment. Identity (type,
// party) isn't editable; create a new assignment for a party change instead.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.GarageAssignment.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Zuordnung nicht gefunden.');

  const parsed = updateGarageAssignmentSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const assignment = await db.orm.public.GarageAssignment.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(assignment);
}

// DELETE is for mistakes only — the normal way to end an assignment is
// PATCH { validTo }.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.GarageAssignment.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Zuordnung nicht gefunden.');

  await db.orm.public.GarageAssignment.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
