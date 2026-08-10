import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createCustomInvoiceSchema } from '@/lib/validation/invoice';
import { generateCustomInvoice } from '@/lib/billing/generate-custom-invoice';

// Free-form invoicing (arbitrary line items) — see
// lib/billing/generate-custom-invoice.ts.
export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['create'] });
  if (denied) return denied;

  const parsed = createCustomInvoiceSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await db.transaction((tx) => generateCustomInvoice(tx, organizationId, parsed.data));

  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data, { status: 201 });
}
