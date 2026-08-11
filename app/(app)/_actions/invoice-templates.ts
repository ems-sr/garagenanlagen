'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createInvoiceTemplateSchema,
  updateInvoiceTemplateSchema,
  type CreateInvoiceTemplateInput,
  type UpdateInvoiceTemplateInput,
} from '@/lib/validation/invoice-template';

type InvoiceTemplate = Awaited<ReturnType<typeof db.orm.public.InvoiceTemplate.create>>;
type Tx = { orm: typeof db.orm };

// Line items are always replaced as a full set on save (delete all, then
// re-create in the submitted order) rather than diffed row-by-row — same
// "submit the whole list" shape the custom-invoice line-item form already
// uses, and templates are edited as a whole in the UI, not row-by-row.
async function replaceLineItems(tx: Tx, organizationId: string, invoiceTemplateId: string, lineItems: CreateInvoiceTemplateInput['lineItems']) {
  await tx.orm.public.InvoiceTemplateLineItem.where({ invoiceTemplateId, organizationId }).deleteAll();
  for (const [index, item] of lineItems.entries()) {
    await tx.orm.public.InvoiceTemplateLineItem.create({
      organizationId,
      invoiceTemplateId,
      lineItemTypeId: item.lineItemTypeId,
      quantity: item.quantity.toString(),
      overrideAmount: item.overrideAmount,
      sortOrder: index,
    });
  }
}

export async function createInvoiceTemplate(input: CreateInvoiceTemplateInput): Promise<ActionResult<InvoiceTemplate>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoiceTemplate: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createInvoiceTemplateSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const template = await db.transaction(async (tx) => {
    const created = await tx.orm.public.InvoiceTemplate.create({
      organizationId,
      name: parsed.data.name,
      invoiceType: parsed.data.invoiceType,
      autoGenerate: parsed.data.autoGenerate,
    });
    await replaceLineItems(tx, organizationId, created.id, parsed.data.lineItems);
    return created;
  });

  return { success: true, data: template };
}

export async function updateInvoiceTemplate(id: string, input: UpdateInvoiceTemplateInput): Promise<ActionResult<InvoiceTemplate>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoiceTemplate: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.InvoiceTemplate.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Rechnungsvorlage nicht gefunden.');

  const parsed = updateInvoiceTemplateSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const template = await db.transaction(async (tx) => {
    const updated = await tx.orm.public.InvoiceTemplate.where({ id, organizationId }).update({
      name: parsed.data.name,
      invoiceType: parsed.data.invoiceType,
      autoGenerate: parsed.data.autoGenerate,
    });
    if (!updated) return null;
    await replaceLineItems(tx, organizationId, id, parsed.data.lineItems);
    return updated;
  });

  if (!template) return actionError('NOT_FOUND', 'Rechnungsvorlage nicht gefunden.');
  return { success: true, data: template };
}

export async function deleteInvoiceTemplate(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoiceTemplate: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.InvoiceTemplate.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Rechnungsvorlage nicht gefunden.');

  await db.orm.public.InvoiceTemplate.where({ id, organizationId }).delete();
  return { success: true, data: null };
}
