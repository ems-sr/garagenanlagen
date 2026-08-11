'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { upsertAttributeAssignmentSchema, type UpsertAttributeAssignmentInput } from '@/lib/validation/garage-attribute';
import { upsertAttributeAssignment } from '@/lib/garages/attribute-assignment';

type AttributeAssignment = Awaited<ReturnType<typeof db.orm.public.GarageAttributeAssignment.create>>;

export async function saveAttributeAssignment(
  garageId: string,
  input: UpsertAttributeAssignmentInput,
): Promise<ActionResult<AttributeAssignment>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garageAttribute: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = upsertAttributeAssignmentSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await upsertAttributeAssignment(organizationId, garageId, parsed.data.attributeTypeId, parsed.data.value);
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}

export async function removeAttributeAssignment(garageId: string, attributeTypeId: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garageAttribute: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.GarageAttributeAssignment.where({ garageId, attributeTypeId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Attributwert nicht gefunden.');

  await db.orm.public.GarageAttributeAssignment.where({ id: existing.id, organizationId }).delete();
  return { success: true, data: null };
}
