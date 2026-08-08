import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createGarageSchema } from '@/lib/validation/garage';

const UNIQUE_VIOLATION = '23505';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['read'] });
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get('facilityId');
  const constructionSectionId = request.nextUrl.searchParams.get('constructionSectionId');
  const blockId = request.nextUrl.searchParams.get('blockId');
  let query = db.orm.public.Garage.where({ organizationId });
  if (facilityId) query = query.where({ facilityId });
  if (constructionSectionId) query = query.where({ constructionSectionId });
  if (blockId) query = query.where({ blockId });

  const items = await query.all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garage: ['create'] });
  if (denied) return denied;

  const parsed = createGarageSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);
  const data = parsed.data;

  const facility = await db.orm.public.Facility.where({ id: data.facilityId, organizationId }).first();
  if (!facility) return jsonError(400, 'INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  if (data.constructionSectionId) {
    const section = await db.orm.public.ConstructionSection.where({
      id: data.constructionSectionId,
      organizationId,
      facilityId: data.facilityId,
    }).first();
    if (!section) {
      return jsonError(400, 'INVALID_CONSTRUCTION_SECTION', 'Bauabschnitt gehört nicht zur angegebenen Garagenanlage.');
    }
  }

  if (data.blockId) {
    const block = await db.orm.public.Block.where({ id: data.blockId, organizationId, facilityId: data.facilityId }).first();
    if (!block) return jsonError(400, 'INVALID_BLOCK', 'Trakt gehört nicht zur angegebenen Garagenanlage.');
  }

  try {
    const garage = await db.orm.public.Garage.create({ ...data, organizationId });
    return NextResponse.json(garage, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, 'DUPLICATE_NUMBER', 'Garagennummer ist in dieser Garagenanlage bereits vergeben.');
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'sqlState' in error && error.sqlState === UNIQUE_VIOLATION;
}
