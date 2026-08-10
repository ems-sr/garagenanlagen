'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createMembershipFeeSchema,
  updateMembershipFeeSchema,
  type CreateMembershipFeeInput,
  type UpdateMembershipFeeInput,
} from '@/lib/validation/membership-fee';

type MembershipFee = Awaited<ReturnType<typeof db.orm.public.MembershipFee.create>>;

export async function createMembershipFee(input: CreateMembershipFeeInput): Promise<ActionResult<MembershipFee>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { membershipFee: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createMembershipFeeSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const fee = await db.orm.public.MembershipFee.create({ ...parsed.data, organizationId });
  return { success: true, data: fee };
}

export async function endMembershipFee(feeId: string, input: UpdateMembershipFeeInput): Promise<ActionResult<MembershipFee>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { membershipFee: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.MembershipFee.where({ id: feeId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Mitgliedsbeitrag nicht gefunden.');

  const parsed = updateMembershipFeeSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const fee = await db.orm.public.MembershipFee.where({ id: feeId, organizationId }).update(parsed.data);
  if (!fee) return actionError('NOT_FOUND', 'Mitgliedsbeitrag nicht gefunden.');
  return { success: true, data: fee };
}
