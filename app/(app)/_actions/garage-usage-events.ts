'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { createUsageNoteSchema, type CreateUsageNoteInput } from '@/lib/validation/garage-usage-event';

type GarageUsageEvent = Awaited<ReturnType<typeof db.orm.public.GarageUsageEvent.create>>;

export async function createUsageNote(garageId: string, input: CreateUsageNoteInput): Promise<ActionResult<GarageUsageEvent>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { garageUsageEvent: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const garage = await db.orm.public.Garage.where({ id: garageId, organizationId }).first();
  if (!garage) return actionError('NOT_FOUND', 'Garage nicht gefunden.');

  const parsed = createUsageNoteSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const event = await db.orm.public.GarageUsageEvent.create({
    organizationId,
    garageId,
    eventType: 'note',
    description: parsed.data.description,
    clubMemberId: parsed.data.clubMemberId,
  });
  return { success: true, data: event };
}
