'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { createMeterReadingSchema, type CreateMeterReadingInput } from '@/lib/validation/meter-reading';
import { isForeignKeyViolation } from '@/lib/api/responses';

type MeterReading = Awaited<ReturnType<typeof db.orm.public.MeterReading.create>>;

export async function createMeterReading(input: CreateMeterReadingInput): Promise<ActionResult<MeterReading>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { meterReading: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createMeterReadingSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);
  const data = parsed.data;

  const garage = await db.orm.public.Garage.where({ id: data.garageId, organizationId }).first();
  if (!garage) return actionError('INVALID_GARAGE', 'Garage nicht gefunden.');

  const reading = await db.orm.public.MeterReading.create({
    ...data,
    value: data.value.toString(),
    organizationId,
  });
  return { success: true, data: reading };
}

export async function deleteMeterReading(readingId: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { meterReading: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.MeterReading.where({ id: readingId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Zählerstand nicht gefunden.');

  try {
    await db.orm.public.MeterReading.where({ id: readingId, organizationId }).delete();
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return actionError('REFERENCED_BY_INVOICE', 'Zählerstand ist bereits in einer Rechnung erfasst und kann nicht gelöscht werden.');
    }
    throw error;
  }
  return { success: true, data: { id: readingId } };
}
