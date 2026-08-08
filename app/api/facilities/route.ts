import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createFacilitySchema } from '@/lib/validation/facility';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.Facility.where({ organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['create'] });
  if (denied) return denied;

  const parsed = createFacilitySchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const facility = await db.orm.public.Facility.create({ ...parsed.data, organizationId });
  return NextResponse.json(facility, { status: 201 });
}
