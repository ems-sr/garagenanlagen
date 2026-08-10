import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateWorkShiftSchema } from '@/lib/validation/work-shift';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const workShift = await db.orm.public.WorkShift.where({ id, organizationId }).first();
  if (!workShift) return jsonError(404, 'NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  const participants = await db.orm.public.ShiftParticipant.where({ workShiftId: id, organizationId }).all();
  return NextResponse.json({ ...workShift, participants });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.WorkShift.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  const parsed = updateWorkShiftSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const workShift = await db.orm.public.WorkShift.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(workShift);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.WorkShift.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  await db.orm.public.WorkShift.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
