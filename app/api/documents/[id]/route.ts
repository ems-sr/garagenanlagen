import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError, isForeignKeyViolation } from '@/lib/api/responses';
import { updateDocumentSchema } from '@/lib/validation/documents';

type RouteParams = { params: Promise<{ id: string }> };

// Download — arbitrary uploaded file types shouldn't be assumed
// browser-renderable, so Content-Disposition is always `attachment` here
// (unlike the PDF report routes, which use `inline`).
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { document: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const document = await db.orm.public.Document.where({ id, organizationId }).first();
  if (!document) return jsonError(404, 'NOT_FOUND', 'Dokument nicht gefunden.');

  return new NextResponse(new Uint8Array(document.content), {
    headers: {
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.fileName.replace(/"/g, '')}"`,
      'Content-Length': String(document.fileSize),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { document: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Document.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Dokument nicht gefunden.');

  const parsed = updateDocumentSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const document = await db.orm.public.Document.where({ id, organizationId }).update(parsed.data);
  if (!document) return jsonError(404, 'NOT_FOUND', 'Dokument nicht gefunden.');
  const { content: _content, ...rest } = document;
  return NextResponse.json(rest);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { document: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Document.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Dokument nicht gefunden.');

  try {
    await db.orm.public.Document.where({ id, organizationId }).delete();
  } catch (error) {
    if (isForeignKeyViolation(error)) return jsonError(409, 'IN_USE', 'Dokument wird noch verwendet.');
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
