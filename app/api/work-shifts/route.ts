import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createWorkShiftSchema } from '@/lib/validation/work-shift';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.WorkShift.where({ organizationId }).orderBy((s) => s.date.desc()).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['create'] });
  if (denied) return denied;

  const parsed = createWorkShiftSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const workShift = await db.orm.public.WorkShift.create({ ...parsed.data, organizationId });
  return NextResponse.json(workShift, { status: 201 });
}
