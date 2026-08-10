import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError, isUniqueViolation } from '@/lib/api/responses';
import { addParticipantSchema } from '@/lib/validation/work-shift';
import { addParticipant } from '@/lib/work-shifts/add-participant';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const items = await db.orm.public.ShiftParticipant.where({ workShiftId: id, organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['create'] });
  if (denied) return denied;

  const { id } = await params;
  const parsed = addParticipantSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  try {
    const result = await db.transaction((tx) =>
      addParticipant(tx, organizationId, id, parsed.data.clubMemberId, parsed.data.hoursWorked),
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 409;
      return jsonError(status, result.error.code, result.error.message);
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, 'ALREADY_PARTICIPATING', 'Mitglied ist diesem Arbeitseinsatz bereits zugeordnet.');
    }
    throw error;
  }
}
