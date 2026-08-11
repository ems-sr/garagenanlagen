import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createUsageNoteSchema } from '@/lib/validation/garage-usage-event';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageUsageEvent: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const items = await db.orm.public.GarageUsageEvent.where({ garageId: id, organizationId }).orderBy((e) => e.occurredAt.desc()).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageUsageEvent: ['create'] });
  if (denied) return denied;

  const { id } = await params;
  const garage = await db.orm.public.Garage.where({ id, organizationId }).first();
  if (!garage) return jsonError(404, 'NOT_FOUND', 'Garage nicht gefunden.');

  const parsed = createUsageNoteSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const event = await db.orm.public.GarageUsageEvent.create({
    organizationId,
    garageId: id,
    eventType: 'note',
    description: parsed.data.description,
    clubMemberId: parsed.data.clubMemberId,
  });
  return NextResponse.json(event, { status: 201 });
}
