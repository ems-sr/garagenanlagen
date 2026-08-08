import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createBlockSchema } from '@/lib/validation/block';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['read'] });
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get('facilityId');
  const constructionSectionId = request.nextUrl.searchParams.get('constructionSectionId');
  let query = db.orm.public.Block.where({ organizationId });
  if (facilityId) query = query.where({ facilityId });
  if (constructionSectionId) query = query.where({ constructionSectionId });

  const items = await query.all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['create'] });
  if (denied) return denied;

  const parsed = createBlockSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const facility = await db.orm.public.Facility.where({ id: parsed.data.facilityId, organizationId }).first();
  if (!facility) return jsonError(400, 'INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  if (parsed.data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: parsed.data.constructionSectionId,
      organizationId,
      facilityId: parsed.data.facilityId,
    }).first();
    if (!section) {
      return jsonError(400, 'INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  const block = await db.orm.public.Block.create({ ...parsed.data, organizationId });
  return NextResponse.json(block, { status: 201 });
}
