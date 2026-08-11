'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { isUniqueViolation } from '@/lib/api/responses';
import {
  createAttributeTypeSchema,
  updateAttributeTypeSchema,
  type CreateAttributeTypeInput,
  type UpdateAttributeTypeInput,
} from '@/lib/validation/garage-attribute';

type GarageAttributeType = Awaited<ReturnType<typeof db.orm.public.GarageAttributeType.create>>;

export async function createAttributeType(input: CreateAttributeTypeInput): Promise<ActionResult<GarageAttributeType>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garageAttribute: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createAttributeTypeSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  try {
    const attributeType = await db.orm.public.GarageAttributeType.create({ ...parsed.data, organizationId });
    return { success: true, data: attributeType };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionError('DUPLICATE_NAME', 'Ein Attributtyp mit diesem Namen existiert bereits.');
    }
    throw error;
  }
}

export async function updateAttributeType(
  id: string,
  input: UpdateAttributeTypeInput,
): Promise<ActionResult<GarageAttributeType>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garageAttribute: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.GarageAttributeType.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Attributtyp nicht gefunden.');

  const parsed = updateAttributeTypeSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  try {
    const attributeType = await db.orm.public.GarageAttributeType.where({ id, organizationId }).update(parsed.data);
    if (!attributeType) return actionError('NOT_FOUND', 'Attributtyp nicht gefunden.');
    return { success: true, data: attributeType };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionError('DUPLICATE_NAME', 'Ein Attributtyp mit diesem Namen existiert bereits.');
    }
    throw error;
  }
}

export async function deleteAttributeType(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garageAttribute: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.GarageAttributeType.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Attributtyp nicht gefunden.');

  await db.orm.public.GarageAttributeType.where({ id, organizationId }).delete();
  return { success: true, data: null };
}
