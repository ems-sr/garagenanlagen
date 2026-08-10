'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { createPaymentSchema, type CreatePaymentInput } from '@/lib/validation/payment';
import { recordPayment as recordPaymentEngine } from '@/lib/billing/record-payment';

type Payment = Awaited<ReturnType<typeof db.orm.public.Payment.create>>;

export async function recordPayment(invoiceId: string, input: CreatePaymentInput): Promise<ActionResult<Payment>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await db.transaction((tx) => recordPaymentEngine(tx, organizationId, invoiceId, parsed.data));
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}
