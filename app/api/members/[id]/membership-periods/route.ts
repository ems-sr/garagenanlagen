import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createMembershipPeriodSchema } from '@/lib/validation/membership-period';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const member = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!member) return jsonError(404, 'NOT_FOUND', 'Mitglied nicht gefunden.');

  const items = await db.orm.public.MembershipPeriod.where({ clubMemberId: id, organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['create'] });
  if (denied) return denied;

  const { id } = await params;
  const member = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!member) return jsonError(404, 'NOT_FOUND', 'Mitglied nicht gefunden.');

  const parsed = createMembershipPeriodSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const period = await db.orm.public.MembershipPeriod.create({
    ...parsed.data,
    clubMemberId: id,
    organizationId,
  });
  return NextResponse.json(period, { status: 201 });
}
