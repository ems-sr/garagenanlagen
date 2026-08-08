import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createBoardMemberSchema } from '@/lib/validation/board-member';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { club: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.BoardMember.where({ organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { club: ['update'] });
  if (denied) return denied;

  const parsed = createBoardMemberSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const boardMember = await db.orm.public.BoardMember.create({ ...parsed.data, organizationId });
  return NextResponse.json(boardMember, { status: 201 });
}
