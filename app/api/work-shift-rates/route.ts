import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createWorkShiftRateSchema } from '@/lib/validation/work-shift-rate';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShiftRate: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.WorkShiftReimbursementRate.where({ organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShiftRate: ['create'] });
  if (denied) return denied;

  const parsed = createWorkShiftRateSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const rate = await db.orm.public.WorkShiftReimbursementRate.create({ ...parsed.data, organizationId });
  return NextResponse.json(rate, { status: 201 });
}
