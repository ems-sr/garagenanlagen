'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import { updateClubProfileSchema, type UpdateClubProfileInput } from '@/lib/validation/club-profile';

type ClubProfile = Awaited<ReturnType<typeof db.orm.public.ClubProfile.upsert>>;

export async function updateClubProfile(input: UpdateClubProfileInput): Promise<ActionResult<ClubProfile>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { club: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = updateClubProfileSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const profile = await db.orm.public.ClubProfile.upsert({
    create: { organizationId, ...parsed.data },
    update: parsed.data,
    conflictOn: { organizationId },
  });
  return { success: true, data: profile };
}
