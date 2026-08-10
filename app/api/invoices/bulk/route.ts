import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createBulkInvoicesSchema } from '@/lib/validation/invoice';
import { generateBulkInvoicesForFacility } from '@/lib/billing/generate-bulk-invoices';

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['create'] });
  if (denied) return denied;

  const parsed = createBulkInvoicesSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const facility = await db.orm.public.Facility.where({ id: parsed.data.facilityId, organizationId }).first();
  if (!facility) return jsonError(400, 'INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  const result = await generateBulkInvoicesForFacility(organizationId, parsed.data.facilityId);
  return NextResponse.json(result, { status: 201 });
}
