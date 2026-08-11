import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError, isUniqueViolation } from '@/lib/api/responses';
import { createAttributeTypeSchema } from '@/lib/validation/garage-attribute';

export async function GET() {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['read'] });
  if (denied) return denied;

  const items = await db.orm.public.GarageAttributeType.where({ organizationId }).orderBy((t) => t.name.asc()).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { garageAttribute: ['create'] });
  if (denied) return denied;

  const parsed = createAttributeTypeSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  try {
    const attributeType = await db.orm.public.GarageAttributeType.create({ ...parsed.data, organizationId });
    return NextResponse.json(attributeType, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, 'DUPLICATE_NAME', 'Ein Attributtyp mit diesem Namen existiert bereits.');
    }
    throw error;
  }
}
