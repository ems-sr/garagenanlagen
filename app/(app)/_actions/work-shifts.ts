'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { isUniqueViolation } from '@/lib/api/responses';
import {
  createWorkShiftSchema,
  updateWorkShiftSchema,
  addParticipantSchema,
  updateParticipantSchema,
  type CreateWorkShiftInput,
  type UpdateWorkShiftInput,
  type AddParticipantInput,
  type UpdateParticipantInput,
} from '@/lib/validation/work-shift';
import { addParticipant } from '@/lib/work-shifts/add-participant';
import { updateParticipantHours } from '@/lib/work-shifts/update-participant';
import { recordPayout, type RecordPayoutResult } from '@/lib/work-shifts/record-payout';

type WorkShift = Awaited<ReturnType<typeof db.orm.public.WorkShift.create>>;
type ShiftParticipant = Awaited<ReturnType<typeof db.orm.public.ShiftParticipant.create>>;

export async function createWorkShift(input: CreateWorkShiftInput): Promise<ActionResult<WorkShift>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShift: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createWorkShiftSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const workShift = await db.orm.public.WorkShift.create({ ...parsed.data, organizationId });
  return { success: true, data: workShift };
}

export async function updateWorkShift(workShiftId: string, input: UpdateWorkShiftInput): Promise<ActionResult<WorkShift>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShift: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.WorkShift.where({ id: workShiftId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  const parsed = updateWorkShiftSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const workShift = await db.orm.public.WorkShift.where({ id: workShiftId, organizationId }).update(parsed.data);
  if (!workShift) return actionError('NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');
  return { success: true, data: workShift };
}

export async function deleteWorkShift(workShiftId: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShift: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.WorkShift.where({ id: workShiftId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  await db.orm.public.WorkShift.where({ id: workShiftId, organizationId }).delete();
  return { success: true, data: null };
}

export async function addParticipantAction(workShiftId: string, input: AddParticipantInput): Promise<ActionResult<ShiftParticipant>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShift: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = addParticipantSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  try {
    const result = await db.transaction((tx) =>
      addParticipant(tx, organizationId, workShiftId, parsed.data.clubMemberId, parsed.data.hoursWorked),
    );
    if (!result.success) return actionError(result.error.code, result.error.message);
    return { success: true, data: result.data };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionError('ALREADY_PARTICIPATING', 'Mitglied ist diesem Arbeitseinsatz bereits zugeordnet.');
    }
    throw error;
  }
}

export async function updateParticipantAction(participantId: string, input: UpdateParticipantInput): Promise<ActionResult<ShiftParticipant>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShift: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = updateParticipantSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await db.transaction((tx) => updateParticipantHours(tx, organizationId, participantId, parsed.data.hoursWorked));
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}

export async function removeParticipantAction(participantId: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShift: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Teilnahme nicht gefunden.');

  await db.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).delete();
  return { success: true, data: null };
}

export async function recordPayoutAction(participantId: string): Promise<ActionResult<RecordPayoutResult>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShift: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const result = await db.transaction((tx) => recordPayout(tx, organizationId, participantId));
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}
