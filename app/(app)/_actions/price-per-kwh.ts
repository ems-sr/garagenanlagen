'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createPricePerKwhSchema,
  updatePricePerKwhSchema,
  type CreatePricePerKwhInput,
  type UpdatePricePerKwhInput,
} from '@/lib/validation/price-per-kwh';

type PricePerKwh = Awaited<ReturnType<typeof db.orm.public.PricePerKwh.create>>;

export async function createPricePerKwh(input: CreatePricePerKwhInput): Promise<ActionResult<PricePerKwh>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { meterReading: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createPricePerKwhSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);
  const data = parsed.data;

  const facility = await db.orm.public.Facility.where({ id: data.facilityId, organizationId }).first();
  if (!facility) return actionError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  const price = await db.orm.public.PricePerKwh.create({ ...data, organizationId });
  return { success: true, data: price };
}

export async function endPricePerKwh(priceId: string, input: UpdatePricePerKwhInput): Promise<ActionResult<PricePerKwh>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { meterReading: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.PricePerKwh.where({ id: priceId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Strompreis nicht gefunden.');

  const parsed = updatePricePerKwhSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const price = await db.orm.public.PricePerKwh.where({ id: priceId, organizationId }).update(parsed.data);
  if (!price) return actionError('NOT_FOUND', 'Strompreis nicht gefunden.');
  return { success: true, data: price };
}
