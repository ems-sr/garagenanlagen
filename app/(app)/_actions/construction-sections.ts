'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { isForeignKeyViolation } from '@/lib/api/responses';
import {
  createConstructionSectionSchema,
  updateConstructionSectionSchema,
  type CreateConstructionSectionInput,
  type UpdateConstructionSectionInput,
} from '@/lib/validation/construction-section';

type ConstructionSection = Awaited<ReturnType<typeof db.orm.public.ConstructionSection.create>>;

export async function createConstructionSection(
  input: CreateConstructionSectionInput,
): Promise<ActionResult<ConstructionSection>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createConstructionSectionSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const facility = await db.orm.public.Facility.where({ id: parsed.data.facilityId, organizationId }).first();
  if (!facility) return actionError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  const section = await db.orm.public.ConstructionSection.create({ ...parsed.data, organizationId });
  return { success: true, data: section };
}

export async function updateConstructionSection(
  id: string,
  input: UpdateConstructionSectionInput,
): Promise<ActionResult<ConstructionSection>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.ConstructionSection.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Bauabschnitt nicht gefunden.');

  const parsed = updateConstructionSectionSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const section = await db.orm.public.ConstructionSection.where({ id, organizationId }).update(parsed.data);
  if (!section) return actionError('NOT_FOUND', 'Bauabschnitt nicht gefunden.');
  return { success: true, data: section };
}

export async function deleteConstructionSection(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.ConstructionSection.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Bauabschnitt nicht gefunden.');

  try {
    await db.orm.public.ConstructionSection.where({ id, organizationId }).delete();
    return { success: true, data: null };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return actionError('REFERENCED', 'Bauabschnitt wird noch von Trakten oder Garagen referenziert.');
    }
    throw error;
  }
}
