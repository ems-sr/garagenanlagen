import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateEmailTemplateSchema } from '@/lib/validation/email-template';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { correspondence: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const template = await db.orm.public.EmailTemplate.where({ id, organizationId }).first();
  if (!template) return jsonError(404, 'NOT_FOUND', 'Vorlage nicht gefunden.');

  return NextResponse.json(template);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { correspondence: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.EmailTemplate.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Vorlage nicht gefunden.');

  const parsed = updateEmailTemplateSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const template = await db.orm.public.EmailTemplate.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(template);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { correspondence: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.EmailTemplate.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Vorlage nicht gefunden.');

  await db.orm.public.EmailTemplate.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
