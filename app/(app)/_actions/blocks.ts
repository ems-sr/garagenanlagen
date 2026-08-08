'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { isForeignKeyViolation } from '@/lib/api/responses';
import {
  createBlockSchema,
  updateBlockSchema,
  type CreateBlockInput,
  type UpdateBlockInput,
} from '@/lib/validation/block';

type Block = Awaited<ReturnType<typeof db.orm.public.Block.create>>;

export async function createBlock(input: CreateBlockInput): Promise<ActionResult<Block>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createBlockSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const facility = await db.orm.public.Facility.where({ id: parsed.data.facilityId, organizationId }).first();
  if (!facility) return actionError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  if (parsed.data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: parsed.data.constructionSectionId,
      organizationId,
      facilityId: parsed.data.facilityId,
    }).first();
    if (!section) {
      return actionError('INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  const block = await db.orm.public.Block.create({ ...parsed.data, organizationId });
  return { success: true, data: block };
}

export async function updateBlock(id: string, input: UpdateBlockInput): Promise<ActionResult<Block>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Block.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Trakt nicht gefunden.');

  const parsed = updateBlockSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const facilityId = parsed.data.facilityId ?? existing.facilityId;
  if (parsed.data.facilityId) {
    const facility = await db.orm.public.Facility.where({ id: facilityId, organizationId }).first();
    if (!facility) return actionError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');
  }

  if (parsed.data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: parsed.data.constructionSectionId,
      organizationId,
      facilityId,
    }).first();
    if (!section) {
      return actionError('INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  const block = await db.orm.public.Block.where({ id, organizationId }).update(parsed.data);
  if (!block) return actionError('NOT_FOUND', 'Trakt nicht gefunden.');
  return { success: true, data: block };
}

export async function deleteBlock(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Block.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Trakt nicht gefunden.');

  try {
    await db.orm.public.Block.where({ id, organizationId }).delete();
    return { success: true, data: null };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return actionError('REFERENCED', 'Trakt wird noch von Garagen referenziert.');
    }
    throw error;
  }
}
