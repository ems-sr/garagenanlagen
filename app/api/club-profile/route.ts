import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { updateClubProfileSchema } from '@/lib/validation/club-profile';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { club: ['read'] });
  if (denied) return denied;

  const profile = await db.orm.public.ClubProfile.where({ organizationId }).first();
  return NextResponse.json(profile ?? { organizationId });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { club: ['update'] });
  if (denied) return denied;

  const parsed = updateClubProfileSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const profile = await db.orm.public.ClubProfile.upsert({
    create: { organizationId, ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json(profile);
}
