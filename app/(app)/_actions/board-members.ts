'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createBoardMemberSchema,
  updateBoardMemberSchema,
  type CreateBoardMemberInput,
  type UpdateBoardMemberInput,
} from '@/lib/validation/board-member';

type BoardMember = Awaited<ReturnType<typeof db.orm.public.BoardMember.create>>;

export async function createBoardMember(input: CreateBoardMemberInput): Promise<ActionResult<BoardMember>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { club: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createBoardMemberSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const boardMember = await db.orm.public.BoardMember.create({ ...parsed.data, organizationId });
  return { success: true, data: boardMember };
}

export async function updateBoardMember(id: string, input: UpdateBoardMemberInput): Promise<ActionResult<BoardMember>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { club: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.BoardMember.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Vorstandsmitglied nicht gefunden.');

  const parsed = updateBoardMemberSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const boardMember = await db.orm.public.BoardMember.where({ id, organizationId }).update(parsed.data);
  if (!boardMember) return actionError('NOT_FOUND', 'Vorstandsmitglied nicht gefunden.');
  return { success: true, data: boardMember };
}

export async function deleteBoardMember(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { club: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.BoardMember.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Vorstandsmitglied nicht gefunden.');

  await db.orm.public.BoardMember.where({ id, organizationId }).delete();
  return { success: true, data: null };
}
