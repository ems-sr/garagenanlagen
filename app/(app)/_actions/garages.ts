'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createGarageSchema,
  updateGarageSchema,
  type CreateGarageInput,
  type UpdateGarageInput,
} from '@/lib/validation/garage';
import { linkNeighbor } from '@/lib/garage-neighbor';

type Garage = Awaited<ReturnType<typeof db.orm.public.Garage.create>>;

const UNIQUE_VIOLATION = '23505';

function uniqueViolationConstraint(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('sqlState' in error) || error.sqlState !== UNIQUE_VIOLATION) {
    return undefined;
  }
  return 'constraint' in error && typeof error.constraint === 'string' ? error.constraint : undefined;
}

export async function createGarage(input: CreateGarageInput): Promise<ActionResult<Garage>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createGarageSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);
  const data = parsed.data;

  const facility = await db.orm.public.Facility.where({ id: data.facilityId, organizationId }).first();
  if (!facility) return actionError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  if (data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: data.constructionSectionId,
      organizationId,
      facilityId: data.facilityId,
    }).first();
    if (!section) {
      return actionError('INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  if (data.blockId) {
    const block = await db.orm.public.Block.where({ id: data.blockId, organizationId, facilityId: data.facilityId }).first();
    if (!block) return actionError('INVALID_BLOCK', 'Trakt gehört nicht zur angegebenen Garagenanlage.');
  }

  if (data.neighborGarageId) {
    const neighbor = await db.orm.public.Garage.where({ id: data.neighborGarageId, organizationId }).first();
    if (!neighbor || neighbor.facilityId !== data.facilityId) {
      return actionError('INVALID_NEIGHBOR', 'Nachbargarage gehört nicht zur angegebenen Garagenanlage.');
    }
    if (neighbor.type !== 'double') {
      return actionError('INVALID_NEIGHBOR', 'Nachbargarage ist keine Doppelgarage.');
    }
  }

  try {
    const garage = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Garage.create({ ...data, organizationId });
      if (data.neighborGarageId) {
        await linkNeighbor(tx, organizationId, created.id, data.neighborGarageId);
      }
      return created;
    });
    return { success: true, data: garage };
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    if (constraint === 'garage_neighborGarageId_key') {
      return actionError('DUPLICATE_NEIGHBOR', 'Diese Garage ist bereits die Nachbargarage einer anderen Garage.');
    }
    if (constraint) {
      return actionError('DUPLICATE_NUMBER', 'Garagennummer ist in dieser Garagenanlage bereits vergeben.');
    }
    throw error;
  }
}

export async function updateGarage(id: string, input: UpdateGarageInput): Promise<ActionResult<Garage>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Garage.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Garage nicht gefunden.');

  const parsed = updateGarageSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);
  const data = parsed.data;

  const facilityId = data.facilityId ?? existing.facilityId;
  if (data.facilityId) {
    const facility = await db.orm.public.Facility.where({ id: facilityId, organizationId }).first();
    if (!facility) return actionError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');
  }

  if (data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: data.constructionSectionId,
      organizationId,
      facilityId,
    }).first();
    if (!section) {
      return actionError('INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  if (data.blockId) {
    const block = await db.orm.public.Block.where({ id: data.blockId, organizationId, facilityId }).first();
    if (!block) return actionError('INVALID_BLOCK', 'Trakt gehört nicht zur angegebenen Garagenanlage.');
  }

  if (data.neighborGarageId) {
    if (data.neighborGarageId === id) {
      return actionError('INVALID_NEIGHBOR', 'Eine Garage kann nicht ihre eigene Nachbargarage sein.');
    }
    const neighbor = await db.orm.public.Garage.where({ id: data.neighborGarageId, organizationId }).first();
    if (!neighbor || neighbor.facilityId !== facilityId) {
      return actionError('INVALID_NEIGHBOR', 'Nachbargarage gehört nicht zur angegebenen Garagenanlage.');
    }
    if (neighbor.type !== 'double') {
      return actionError('INVALID_NEIGHBOR', 'Nachbargarage ist keine Doppelgarage.');
    }
  }

  try {
    const garage = await db.transaction(async (tx) => {
      const updated = await tx.orm.public.Garage.where({ id, organizationId }).update(data);
      if (!updated) return null;

      if (data.neighborGarageId !== undefined && data.neighborGarageId !== existing.neighborGarageId) {
        // This garage's previous partner (if any) would otherwise keep
        // pointing back at a garage that no longer points at it — true both
        // when re-pairing to someone else and when explicitly clearing to
        // null.
        if (existing.neighborGarageId) {
          await tx.orm.public.Garage.where({ id: existing.neighborGarageId, organizationId }).update({
            neighborGarageId: null,
          });
        }
        if (data.neighborGarageId) {
          await linkNeighbor(tx, organizationId, id, data.neighborGarageId);
        }
      }

      return updated;
    });
    if (!garage) return actionError('NOT_FOUND', 'Garage nicht gefunden.');
    return { success: true, data: garage };
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    if (constraint === 'garage_neighborGarageId_key') {
      return actionError('DUPLICATE_NEIGHBOR', 'Diese Garage ist bereits die Nachbargarage einer anderen Garage.');
    }
    if (constraint) {
      return actionError('DUPLICATE_NUMBER', 'Garagennummer ist in dieser Garagenanlage bereits vergeben.');
    }
    throw error;
  }
}

export async function deleteGarage(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garage: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Garage.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Garage nicht gefunden.');

  await db.orm.public.Garage.where({ id, organizationId }).delete();
  return { success: true, data: null };
}
