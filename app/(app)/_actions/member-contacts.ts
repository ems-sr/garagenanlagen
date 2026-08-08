'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createMemberContactSchema,
  updateMemberContactSchema,
  type CreateMemberContactInput,
  type UpdateMemberContactInput,
} from '@/lib/validation/member-contact';

type MemberContact = Awaited<ReturnType<typeof db.orm.public.MemberContact.create>>;

export async function createMemberContact(
  memberId: string,
  input: CreateMemberContactInput,
): Promise<ActionResult<MemberContact>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const member = await db.orm.public.ClubMember.where({ id: memberId, organizationId }).first();
  if (!member) return actionError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const parsed = createMemberContactSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const contact = await db.orm.public.MemberContact.create({
    ...parsed.data,
    clubMemberId: memberId,
    organizationId,
  });
  return { success: true, data: contact };
}

export async function updateMemberContact(
  memberId: string,
  contactId: string,
  input: UpdateMemberContactInput,
): Promise<ActionResult<MemberContact>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.MemberContact.where({
    id: contactId,
    clubMemberId: memberId,
    organizationId,
  }).first();
  if (!existing) return actionError('NOT_FOUND', 'Kontakt nicht gefunden.');

  const parsed = updateMemberContactSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const contact = await db.orm.public.MemberContact.where({ id: contactId, organizationId }).update(parsed.data);
  if (!contact) return actionError('NOT_FOUND', 'Kontakt nicht gefunden.');
  return { success: true, data: contact };
}

export async function deleteMemberContact(memberId: string, contactId: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.MemberContact.where({
    id: contactId,
    clubMemberId: memberId,
    organizationId,
  }).first();
  if (!existing) return actionError('NOT_FOUND', 'Kontakt nicht gefunden.');

  await db.orm.public.MemberContact.where({ id: contactId, organizationId }).delete();
  return { success: true, data: null };
}
