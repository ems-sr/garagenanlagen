import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createMembershipFeeSchema } from '@/lib/validation/membership-fee';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { membershipFee: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.MembershipFee.where({ organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { membershipFee: ['create'] });
  if (denied) return denied;

  const parsed = createMembershipFeeSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const fee = await db.orm.public.MembershipFee.create({ ...parsed.data, organizationId });
  return NextResponse.json(fee, { status: 201 });
}
