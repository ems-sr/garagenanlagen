import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { uploadDocumentSchema } from '@/lib/validation/documents';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

// GET lists document metadata only — content (the BLOB) is deliberately
// stripped here, never passed through NextResponse.json, so listing every
// document in an org doesn't balloon the response with binary payloads.
// Download is a separate endpoint (GET /api/documents/[id]).
export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { document: ['read'] });
  if (denied) return denied;

  const clubMemberId = request.nextUrl.searchParams.get('clubMemberId');
  const facilityId = request.nextUrl.searchParams.get('facilityId');

  let query = db.orm.public.Document.where({ organizationId });
  if (clubMemberId) query = query.where({ clubMemberId });
  if (facilityId) query = query.where({ facilityId });

  const documents = await query.orderBy((d) => d.createdAt.desc()).all();
  const items = documents.map(({ content: _content, ...rest }) => rest);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId, session } = ctx;

  const denied = await requirePermission(organizationId, { document: ['create'] });
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return jsonError(400, 'VALIDATION_ERROR', 'Datei erforderlich.');
  if (file.size === 0) return jsonError(400, 'VALIDATION_ERROR', 'Datei ist leer.');
  if (file.size > MAX_FILE_SIZE) return jsonError(400, 'FILE_TOO_LARGE', 'Datei ist zu groß (max. 20 MB).');

  const parsed = uploadDocumentSchema.safeParse({
    clubMemberId: formData.get('clubMemberId') || undefined,
    facilityId: formData.get('facilityId') || undefined,
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) return zodError(parsed);

  const content = Buffer.from(await file.arrayBuffer());
  const document = await db.orm.public.Document.create({
    organizationId,
    ...parsed.data,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: content.length,
    content,
    uploadedByUserId: session.user.id,
  });

  const { content: _content, ...rest } = document;
  return NextResponse.json(rest, { status: 201 });
}
