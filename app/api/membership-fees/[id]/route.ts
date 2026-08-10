import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateMembershipFeeSchema } from '@/lib/validation/membership-fee';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { membershipFee: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const fee = await db.orm.public.MembershipFee.where({ id, organizationId }).first();
  if (!fee) return jsonError(404, 'NOT_FOUND', 'Mitgliedsbeitrag nicht gefunden.');

  return NextResponse.json(fee);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { membershipFee: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.MembershipFee.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Mitgliedsbeitrag nicht gefunden.');

  const parsed = updateMembershipFeeSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const fee = await db.orm.public.MembershipFee.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(fee);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { membershipFee: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.MembershipFee.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Mitgliedsbeitrag nicht gefunden.');

  await db.orm.public.MembershipFee.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
