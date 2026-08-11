'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createLineItemTypeSchema,
  updateLineItemTypeSchema,
  type CreateLineItemTypeInput,
  type UpdateLineItemTypeInput,
} from '@/lib/validation/line-item-type';

type LineItemType = Awaited<ReturnType<typeof db.orm.public.LineItemType.create>>;

export async function createLineItemType(input: CreateLineItemTypeInput): Promise<ActionResult<LineItemType>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoiceTemplate: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createLineItemTypeSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const lineItemType = await db.orm.public.LineItemType.create({ ...parsed.data, organizationId });
  return { success: true, data: lineItemType };
}

export async function updateLineItemType(id: string, input: UpdateLineItemTypeInput): Promise<ActionResult<LineItemType>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoiceTemplate: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.LineItemType.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Rechnungsposten-Typ nicht gefunden.');

  const parsed = updateLineItemTypeSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const lineItemType = await db.orm.public.LineItemType.where({ id, organizationId }).update(parsed.data);
  if (!lineItemType) return actionError('NOT_FOUND', 'Rechnungsposten-Typ nicht gefunden.');
  return { success: true, data: lineItemType };
}

export async function deleteLineItemType(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoiceTemplate: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.LineItemType.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Rechnungsposten-Typ nicht gefunden.');

  const usedInTemplate = await db.orm.public.InvoiceTemplateLineItem.where({ lineItemTypeId: id, organizationId }).first();
  if (usedInTemplate) {
    return actionError('IN_USE', 'Dieser Rechnungsposten-Typ wird in einer Rechnungsvorlage verwendet und kann nicht gelöscht werden.');
  }

  await db.orm.public.LineItemType.where({ id, organizationId }).delete();
  return { success: true, data: null };
}
