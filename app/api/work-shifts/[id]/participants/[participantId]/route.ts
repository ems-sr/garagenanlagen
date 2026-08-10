import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateParticipantSchema } from '@/lib/validation/work-shift';
import { updateParticipantHours } from '@/lib/work-shifts/update-participant';

type RouteParams = { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['update'] });
  if (denied) return denied;

  const { participantId } = await params;
  const parsed = updateParticipantSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await db.transaction((tx) => updateParticipantHours(tx, organizationId, participantId, parsed.data.hoursWorked));

  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 409;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['delete'] });
  if (denied) return denied;

  const { participantId } = await params;
  const existing = await db.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Teilnahme nicht gefunden.');

  await db.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
