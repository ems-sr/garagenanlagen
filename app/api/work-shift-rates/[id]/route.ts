import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { updateWorkShiftRateSchema } from '@/lib/validation/work-shift-rate';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShiftRate: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const rate = await db.orm.public.WorkShiftReimbursementRate.where({ id, organizationId }).first();
  if (!rate) return jsonError(404, 'NOT_FOUND', 'Aufwandsentschädigungssatz nicht gefunden.');

  return NextResponse.json(rate);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShiftRate: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.WorkShiftReimbursementRate.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Aufwandsentschädigungssatz nicht gefunden.');

  const parsed = updateWorkShiftRateSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const rate = await db.orm.public.WorkShiftReimbursementRate.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(rate);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShiftRate: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.WorkShiftReimbursementRate.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Aufwandsentschädigungssatz nicht gefunden.');

  await db.orm.public.WorkShiftReimbursementRate.where({ id, organizationId }).delete();
  return new NextResponse(null, { status: 204 });
}
