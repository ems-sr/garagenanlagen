'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  type CreateEmailTemplateInput,
  type UpdateEmailTemplateInput,
} from '@/lib/validation/email-template';

type EmailTemplate = Awaited<ReturnType<typeof db.orm.public.EmailTemplate.create>>;

export async function createEmailTemplate(input: CreateEmailTemplateInput): Promise<ActionResult<EmailTemplate>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { correspondence: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createEmailTemplateSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const template = await db.orm.public.EmailTemplate.create({ ...parsed.data, organizationId });
  return { success: true, data: template };
}

export async function updateEmailTemplate(id: string, input: UpdateEmailTemplateInput): Promise<ActionResult<EmailTemplate>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { correspondence: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.EmailTemplate.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Vorlage nicht gefunden.');

  const parsed = updateEmailTemplateSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const template = await db.orm.public.EmailTemplate.where({ id, organizationId }).update(parsed.data);
  if (!template) return actionError('NOT_FOUND', 'Vorlage nicht gefunden.');
  return { success: true, data: template };
}

export async function deleteEmailTemplate(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { correspondence: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.EmailTemplate.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Vorlage nicht gefunden.');

  await db.orm.public.EmailTemplate.where({ id, organizationId }).delete();
  return { success: true, data: null };
}
