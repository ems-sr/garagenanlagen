import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateMembershipPeriodSchema } from '@/lib/validation/membership-period';

type RouteParams = { params: Promise<{ id: string; periodId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['read'] });
  if (denied) return denied;

  const { id, periodId } = await params;
  const period = await db.orm.public.MembershipPeriod.where({ id: periodId, clubMemberId: id, organizationId }).first();
  if (!period) return jsonError(404, 'NOT_FOUND', 'Mitgliedschaftszeitraum nicht gefunden.');

  return NextResponse.json(period);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['update'] });
  if (denied) return denied;

  const { id, periodId } = await params;
  const existing = await db.orm.public.MembershipPeriod.where({ id: periodId, clubMemberId: id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Mitgliedschaftszeitraum nicht gefunden.');

  const parsed = updateMembershipPeriodSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const period = await db.orm.public.MembershipPeriod.where({ id: periodId, organizationId }).update(parsed.data);
  return NextResponse.json(period);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['delete'] });
  if (denied) return denied;

  const { id, periodId } = await params;
  const existing = await db.orm.public.MembershipPeriod.where({ id: periodId, clubMemberId: id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Mitgliedschaftszeitraum nicht gefunden.');

  await db.orm.public.MembershipPeriod.where({ id: periodId, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
