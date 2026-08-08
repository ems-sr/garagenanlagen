'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createMembershipPeriodSchema,
  updateMembershipPeriodSchema,
  type CreateMembershipPeriodInput,
  type UpdateMembershipPeriodInput,
} from '@/lib/validation/membership-period';

type MembershipPeriod = Awaited<ReturnType<typeof db.orm.public.MembershipPeriod.create>>;

export async function createMembershipPeriod(
  memberId: string,
  input: CreateMembershipPeriodInput,
): Promise<ActionResult<MembershipPeriod>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const member = await db.orm.public.ClubMember.where({ id: memberId, organizationId }).first();
  if (!member) return actionError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const parsed = createMembershipPeriodSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const period = await db.orm.public.MembershipPeriod.create({
    ...parsed.data,
    clubMemberId: memberId,
    organizationId,
  });
  return { success: true, data: period };
}

export async function endMembershipPeriod(
  memberId: string,
  periodId: string,
  input: UpdateMembershipPeriodInput,
): Promise<ActionResult<MembershipPeriod>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.MembershipPeriod.where({
    id: periodId,
    clubMemberId: memberId,
    organizationId,
  }).first();
  if (!existing) return actionError('NOT_FOUND', 'Mitgliedschaftszeitraum nicht gefunden.');

  const parsed = updateMembershipPeriodSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const period = await db.orm.public.MembershipPeriod.where({ id: periodId, organizationId }).update(parsed.data);
  if (!period) return actionError('NOT_FOUND', 'Mitgliedschaftszeitraum nicht gefunden.');
  return { success: true, data: period };
}
