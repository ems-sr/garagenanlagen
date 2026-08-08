import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createGarageUserSchema } from '@/lib/validation/garage-user';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.GarageUser.where({ organizationId }).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['create'] });
  if (denied) return denied;

  const parsed = createGarageUserSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const garageUser = await db.orm.public.GarageUser.create({ ...parsed.data, organizationId });
  return NextResponse.json(garageUser, { status: 201 });
}
