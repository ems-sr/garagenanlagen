'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createWorkShiftDepositAmountSchema,
  updateWorkShiftDepositAmountSchema,
  type CreateWorkShiftDepositAmountInput,
  type UpdateWorkShiftDepositAmountInput,
} from '@/lib/validation/work-shift-deposit-amount';

type WorkShiftDepositAmount = Awaited<ReturnType<typeof db.orm.public.WorkShiftDepositAmount.create>>;

export async function createWorkShiftDepositAmount(
  input: CreateWorkShiftDepositAmountInput,
): Promise<ActionResult<WorkShiftDepositAmount>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShiftDepositAmount: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createWorkShiftDepositAmountSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const amount = await db.orm.public.WorkShiftDepositAmount.create({ ...parsed.data, organizationId });
  return { success: true, data: amount };
}

export async function endWorkShiftDepositAmount(
  amountId: string,
  input: UpdateWorkShiftDepositAmountInput,
): Promise<ActionResult<WorkShiftDepositAmount>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { workShiftDepositAmount: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.WorkShiftDepositAmount.where({ id: amountId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Kautionsbetrag nicht gefunden.');

  const parsed = updateWorkShiftDepositAmountSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const amount = await db.orm.public.WorkShiftDepositAmount.where({ id: amountId, organizationId }).update(parsed.data);
  if (!amount) return actionError('NOT_FOUND', 'Kautionsbetrag nicht gefunden.');
  return { success: true, data: amount };
}
