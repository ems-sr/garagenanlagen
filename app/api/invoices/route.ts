import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createInvoiceSchema } from '@/lib/validation/invoice';
import { generateInvoiceForReading } from '@/lib/billing/generate-invoice';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['read'] });
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get('facilityId');
  const status = request.nextUrl.searchParams.get('status');
  const clubMemberId = request.nextUrl.searchParams.get('clubMemberId');
  const type = request.nextUrl.searchParams.get('type');

  let query = db.orm.public.Invoice.where({ organizationId });
  if (facilityId) query = query.where({ facilityId });
  if (status) query = query.where({ status: status as 'open' | 'partiallyPaid' | 'paid' | 'canceled' });
  if (clubMemberId) query = query.where({ clubMemberId });
  if (type) query = query.where({ type: type as 'consumption' | 'membershipFee' | 'custom' | 'creditNote' });

  const items = await query.orderBy((i) => i.issueDate.desc()).all();
  return NextResponse.json({ items });
}

// Triggers the billing engine for a single meter reading — there's no
// free-form Invoice creation, see lib/validation/invoice.ts.
export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['create'] });
  if (denied) return denied;

  const parsed = createInvoiceSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await db.transaction((tx) => generateInvoiceForReading(tx, organizationId, parsed.data.meterReadingId));

  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data, { status: 201 });
}
