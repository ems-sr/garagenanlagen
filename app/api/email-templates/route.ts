import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createEmailTemplateSchema } from '@/lib/validation/email-template';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { correspondence: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.EmailTemplate.where({ organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { correspondence: ['create'] });
  if (denied) return denied;

  const parsed = createEmailTemplateSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const template = await db.orm.public.EmailTemplate.create({ ...parsed.data, organizationId });
  return NextResponse.json(template, { status: 201 });
}
