'use server';

import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { sendCorrespondenceSchema, type SendCorrespondenceInput } from '@/lib/validation/correspondence';
import { sendCorrespondence, type SendCorrespondenceResult } from '@/lib/email/send-correspondence';

export async function sendCorrespondenceAction(input: SendCorrespondenceInput): Promise<ActionResult<SendCorrespondenceResult>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { correspondence: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = sendCorrespondenceSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await sendCorrespondence(organizationId, parsed.data);
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}
