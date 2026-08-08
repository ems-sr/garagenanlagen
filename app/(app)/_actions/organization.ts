'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, type ActionResult } from '@/lib/actions/result';

export async function updateOrganizationName(name: string): Promise<ActionResult<{ name: string }>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { organization: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  if (!name.trim()) return actionError('VALIDATION_ERROR', 'Vereinsname erforderlich');

  const organization = await auth.api.updateOrganization({
    headers: await headers(),
    body: { organizationId, data: { name } },
  });
  return { success: true, data: { name: organization?.name ?? name } };
}
