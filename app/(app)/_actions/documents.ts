'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { uploadDocumentSchema, updateDocumentSchema, type UpdateDocumentInput } from '@/lib/validation/documents';

type Document = Awaited<ReturnType<typeof db.orm.public.Document.create>>;
type DocumentMeta = Omit<Document, 'content'>;

const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Takes FormData directly (Server Actions accept it natively via
// `<form action={uploadDocumentAction}>`) rather than a typed input object —
// the file itself doesn't fit the zod-input shape every other action here
// uses.
export async function uploadDocumentAction(formData: FormData): Promise<ActionResult<DocumentMeta>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { document: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const file = formData.get('file');
  if (!(file instanceof File)) return actionError('VALIDATION_ERROR', 'Datei erforderlich.');
  if (file.size === 0) return actionError('VALIDATION_ERROR', 'Datei ist leer.');
  if (file.size > MAX_FILE_SIZE) return actionError('FILE_TOO_LARGE', 'Datei ist zu groß (max. 20 MB).');

  const parsed = uploadDocumentSchema.safeParse({
    clubMemberId: formData.get('clubMemberId') || undefined,
    facilityId: formData.get('facilityId') || undefined,
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) return zodActionError(parsed);

  const session = await auth.api.getSession({ headers: await headers() });
  const content = Buffer.from(await file.arrayBuffer());
  const document = await db.orm.public.Document.create({
    organizationId,
    ...parsed.data,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: content.length,
    content,
    uploadedByUserId: session?.user.id,
  });

  const { content: _content, ...rest } = document;
  return { success: true, data: rest };
}

export async function updateDocumentAction(id: string, input: UpdateDocumentInput): Promise<ActionResult<DocumentMeta>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { document: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Document.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Dokument nicht gefunden.');

  const parsed = updateDocumentSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const document = await db.orm.public.Document.where({ id, organizationId }).update(parsed.data);
  if (!document) return actionError('NOT_FOUND', 'Dokument nicht gefunden.');
  const { content: _content, ...rest } = document;
  return { success: true, data: rest };
}

export async function deleteDocumentAction(id: string): Promise<ActionResult<null>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { document: ['delete'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Document.where({ id, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Dokument nicht gefunden.');

  await db.orm.public.Document.where({ id, organizationId }).delete();
  return { success: true, data: null };
}
