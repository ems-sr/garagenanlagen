import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { isForeignKeyViolation, jsonError, zodError } from '@/lib/api/responses';
import { updateBlockSchema } from '@/lib/validation/block';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['read'] });
  if (denied) return denied;

  const { id } = await params;
  const block = await db.orm.public.Block.where({ id, organizationId }).first();
  if (!block) return jsonError(404, 'NOT_FOUND', 'Trakt nicht gefunden.');

  return NextResponse.json(block);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['update'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Block.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Trakt nicht gefunden.');

  const parsed = updateBlockSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const facilityId = parsed.data.facilityId ?? existing.facilityId;
  if (parsed.data.facilityId) {
    const facility = await db.orm.public.Facility.where({ id: facilityId, organizationId }).first();
    if (!facility) return jsonError(400, 'INVALID_FACILITY', 'Garagenanlage nicht gefunden.');
  }

  if (parsed.data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: parsed.data.constructionSectionId,
      organizationId,
      facilityId,
    }).first();
    if (!section) {
      return jsonError(400, 'INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  const block = await db.orm.public.Block.where({ id, organizationId }).update(parsed.data);
  return NextResponse.json(block);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['delete'] });
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.orm.public.Block.where({ id, organizationId }).first();
  if (!existing) return jsonError(404, 'NOT_FOUND', 'Trakt nicht gefunden.');

  try {
    await db.orm.public.Block.where({ id, organizationId }).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return jsonError(409, 'REFERENCED', 'Trakt wird noch von Garagen referenziert.');
    }
    throw error;
  }
}
