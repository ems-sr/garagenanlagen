'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createClubMemberSchema,
  updateClubMemberSchema,
  type CreateClubMemberInput,
  type UpdateClubMemberInput,
} from '@/lib/validation/club-member';

type ClubMember = Awaited<ReturnType<typeof db.orm.public.ClubMember.create>>;

export async function createMember(input: CreateClubMemberInput): Promise<ActionResult<ClubMember>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createClubMemberSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const member = await db.orm.public.ClubMember.create({ ...parsed.data, organizationId });
  return { success: true, data: member };
}

export async function updateMember(id: string, input: UpdateClubMemberInput): Promise<ActionResult<ClubMember>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const parsed = updateClubMemberSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const member = await db.orm.public.ClubMember.where({ id, organizationId }).update(parsed.data);
  if (!member) return actionError('NOT_FOUND', 'Mitglied nicht gefunden.');
  return { success: true, data: member };
}
