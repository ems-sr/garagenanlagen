import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createGarageAssignmentSchema } from '@/lib/validation/garage-assignment';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['read'] });
  if (denied) return denied;

  const garageId = request.nextUrl.searchParams.get('garageId');
  const clubMemberId = request.nextUrl.searchParams.get('clubMemberId');
  let query = db.orm.public.GarageAssignment.where({ organizationId });
  if (garageId) query = query.where({ garageId });
  if (clubMemberId) query = query.where({ clubMemberId });

  const items = await query.all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { member: ['create'] });
  if (denied) return denied;

  const parsed = createGarageAssignmentSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);
  const data = parsed.data;

  const garage = await db.orm.public.Garage.where({ id: data.garageId, organizationId }).first();
  if (!garage) return jsonError(400, 'INVALID_GARAGE', 'Garage nicht gefunden.');

  const activeMember = await db.orm.public.GarageAssignment.where({ garageId: data.garageId, organizationId, type: 'member' })
    .where((a) => a.validTo.isNull())
    .first();
  const activeUser = await db.orm.public.GarageAssignment.where({ garageId: data.garageId, organizationId, type: 'user' })
    .where((a) => a.validTo.isNull())
    .first();
  const activeTenant = await db.orm.public.GarageAssignment.where({ garageId: data.garageId, organizationId, type: 'tenant' })
    .where((a) => a.validTo.isNull())
    .first();

  if (data.type === 'member') {
    const member = await db.orm.public.ClubMember.where({ id: data.clubMemberId, organizationId }).first();
    if (!member) return jsonError(400, 'INVALID_MEMBER', 'Mitglied nicht gefunden.');
    if (activeTenant) {
      return jsonError(409, 'CONFLICTING_ASSIGNMENT', 'Garage ist bereits direkt an einen Mieter vermietet.');
    }
  }

  if (data.type === 'user') {
    const garageUser = await db.orm.public.GarageUser.where({ id: data.garageUserId, organizationId }).first();
    if (!garageUser) return jsonError(400, 'INVALID_GARAGE_USER', 'Garagennutzer nicht gefunden.');
    if (!activeMember) {
      return jsonError(400, 'NO_ACTIVE_MEMBER_ASSIGNMENT', 'Garage ist derzeit keinem Mitglied zugewiesen.');
    }
  }

  if (data.type === 'tenant') {
    const tenant = await db.orm.public.Tenant.where({ id: data.tenantId, organizationId }).first();
    if (!tenant) return jsonError(400, 'INVALID_TENANT', 'Mieter nicht gefunden.');
    if (activeMember || activeUser) {
      return jsonError(409, 'CONFLICTING_ASSIGNMENT', 'Garage ist derzeit einem Mitglied zugewiesen.');
    }
  }

  const assignment = await db.orm.public.GarageAssignment.create({ ...data, organizationId });
  return NextResponse.json(assignment, { status: 201 });
}
