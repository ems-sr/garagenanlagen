import { NextResponse, type NextRequest } from 'next/server';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { createBulkMembershipFeeInvoicesSchema } from '@/lib/validation/invoice';
import { generateBulkMembershipFeeInvoices } from '@/lib/billing/generate-bulk-membership-fee-invoices';

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { invoice: ['create'] });
  if (denied) return denied;

  const parsed = createBulkMembershipFeeInvoicesSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await generateBulkMembershipFeeInvoices(organizationId, parsed.data.periodStart, parsed.data.periodEnd);
  return NextResponse.json(result, { status: 201 });
}
