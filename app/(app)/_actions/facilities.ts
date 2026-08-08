'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { isForeignKeyViolation } from '@/lib/api/responses';
import {
  createFacilitySchema,
  updateFacilitySchema,
  type CreateFacilityInput,
  type UpdateFacilityInput,
} from '@/lib/validation/facility';

type Facility = Awaited<ReturnType<typeof db.orm.public.Facility.create>>;

export async function createFacility(input: CreateFacilityInput): Promise<ActionResult<Facility>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createFacilitySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const facility = await db.orm.public.Facility.create({ ...parsed.data, organizationId });
  return { success: true, data: facility };
}

export async function updateFacility(id: string, input: UpdateFacilityInput): Promise<ActionResult<Facility>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Facility.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Garagenanlage nicht gefunden.');

  const parsed = updateFacilitySchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const facility = await db.orm.public.Facility.where({ id, organizationId }).update(parsed.data);
  if (!facility) return actionError('NOT_FOUND', 'Garagenanlage nicht gefunden.');
  return { success: true, data: facility };
}

export async function deleteFacility(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Facility.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Garagenanlage nicht gefunden.');

  try {
    await db.orm.public.Facility.where({ id, organizationId }).delete();
    return { success: true, data: null };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return actionError('REFERENCED', 'Garagenanlage wird noch von Bauabschnitten, Trakten oder Garagen referenziert.');
    }
    throw error;
  }
}
