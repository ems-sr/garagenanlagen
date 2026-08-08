import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { isForeignKeyViolation, jsonError, zodError } from '@/lib/api/responses';
import { updateClubMemberSchema } from '@/lib/validation/club-member';

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

  return NextResponse.json(member);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Mitglied nicht gefunden.');

  const parsed = updateClubMemberSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const member = await db.orm.public.ClubMember.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(member);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Mitglied nicht gefunden.');

  try {
    await db.orm.public.ClubMember.where({ id, organizationId }).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return jsonError(409, 'REFERENCED', 'Mitglied wird noch von Garagenzuordnungen referenziert.');
    }
    throw error;
  }
}
