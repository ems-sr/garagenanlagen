import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createClubMemberSchema } from '@/lib/validation/club-member';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.ClubMember.where({ organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['create'] });
  if (denied) return denied;

  const parsed = createClubMemberSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const member = await db.orm.public.ClubMember.create({ ...parsed.data, organizationId });
  return NextResponse.json(member, { status: 201 });
}
