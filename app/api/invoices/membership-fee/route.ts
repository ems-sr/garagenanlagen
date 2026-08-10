import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { createMembershipFeeInvoiceSchema } from '@/lib/validation/invoice';
import { generateMembershipFeeInvoiceForMember } from '@/lib/billing/generate-membership-fee-invoice';

// Triggers the dues billing engine for a single member/period — see
// lib/billing/generate-membership-fee-invoice.ts.
export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['create'] });
  if (denied) return denied;

  const parsed = createMembershipFeeInvoiceSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await db.transaction((tx) =>
    generateMembershipFeeInvoiceForMember(tx, organizationId, parsed.data.clubMemberId, parsed.data.periodStart, parsed.data.periodEnd),
  );

  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data, { status: 201 });
}
