'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createMemberAddressSchema,
  updateMemberAddressSchema,
  type CreateMemberAddressInput,
  type UpdateMemberAddressInput,
} from '@/lib/validation/member-address';

type MemberAddress = Awaited<ReturnType<typeof db.orm.public.MemberAddress.create>>;

export async function createMemberAddress(
  memberId: string,
  input: CreateMemberAddressInput,
): Promise<ActionResult<MemberAddress>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const member = await db.orm.public.ClubMember.where({ id: memberId, organizationId }).first();
  if (!member) return actionError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const parsed = createMemberAddressSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const address = await db.orm.public.MemberAddress.create({
    ...parsed.data,
    clubMemberId: memberId,
    organizationId,
  });
  return { success: true, data: address };
}

export async function updateMemberAddress(
  memberId: string,
  addressId: string,
  input: UpdateMemberAddressInput,
): Promise<ActionResult<MemberAddress>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.MemberAddress.where({
    id: addressId,
    clubMemberId: memberId,
    organizationId,
  }).first();
  if (!existing) return actionError('NOT_FOUND', 'Adresse nicht gefunden.');

  const parsed = updateMemberAddressSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const address = await db.orm.public.MemberAddress.where({ id: addressId, organizationId }).update(parsed.data);
  if (!address) return actionError('NOT_FOUND', 'Adresse nicht gefunden.');
  return { success: true, data: address };
}

export async function deleteMemberAddress(memberId: string, addressId: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.MemberAddress.where({
    id: addressId,
    clubMemberId: memberId,
    organizationId,
  }).first();
  if (!existing) return actionError('NOT_FOUND', 'Adresse nicht gefunden.');

  await db.orm.public.MemberAddress.where({ id: addressId, organizationId }).delete();
  return { success: true, data: null };
}
