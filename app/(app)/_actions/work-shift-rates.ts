'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createWorkShiftRateSchema,
  updateWorkShiftRateSchema,
  type CreateWorkShiftRateInput,
  type UpdateWorkShiftRateInput,
} from '@/lib/validation/work-shift-rate';

type WorkShiftReimbursementRate = Awaited<ReturnType<typeof db.orm.public.WorkShiftReimbursementRate.create>>;

export async function createWorkShiftRate(input: CreateWorkShiftRateInput): Promise<ActionResult<WorkShiftReimbursementRate>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShiftRate: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createWorkShiftRateSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const rate = await db.orm.public.WorkShiftReimbursementRate.create({ ...parsed.data, organizationId });
  return { success: true, data: rate };
}

export async function endWorkShiftRate(rateId: string, input: UpdateWorkShiftRateInput): Promise<ActionResult<WorkShiftReimbursementRate>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShiftRate: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.WorkShiftReimbursementRate.where({ id: rateId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Aufwandsentschädigungssatz nicht gefunden.');

  const parsed = updateWorkShiftRateSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const rate = await db.orm.public.WorkShiftReimbursementRate.where({ id: rateId, organizationId }).update(parsed.data);
  if (!rate) return actionError('NOT_FOUND', 'Aufwandsentschädigungssatz nicht gefunden.');
  return { success: true, data: rate };
}
