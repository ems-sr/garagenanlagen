import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateBoardMemberSchema } from '@/lib/validation/board-member';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { club: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.BoardMember.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Vorstandsmitglied nicht gefunden.');

  const parsed = updateBoardMemberSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const boardMember = await db.orm.public.BoardMember.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(boardMember);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { club: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.BoardMember.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Vorstandsmitglied nicht gefunden.');

  await db.orm.public.BoardMember.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
