import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import type { ActionError } from '@/lib/actions/result';

// Server Action equivalent of lib/api/context.ts's getRequestContext(): every
// action starts by resolving the session and active organization, but
// returns a plain ActionError instead of a NextResponse since actions don't
// produce HTTP responses directly.
type ActionContext = { organizationId: string };
type ActionContextResult = ActionContext | { error: ActionError };

export async function getActionContext(): Promise<ActionContextResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { error: { code: 'UNAUTHENTICATED', message: 'Nicht angemeldet.' } };
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return { error: { code: 'NO_ACTIVE_ORGANIZATION', message: 'Keine aktive Organisation ausgewählt.' } };
  }

  return { organizationId };
}

// Action equivalent of lib/api/permissions.ts's requirePermission().
export async function requireActionPermission(
  organizationId: string,
  permissions: Record<string, string[]>,
): Promise<ActionError | null> {
  const result = await auth.api.hasPermission({
    headers: await headers(),
    body: { organizationId, permissions },
  });

  if (!result.success) {
    return { code: 'FORBIDDEN', message: 'Keine Berechtigung für diese Aktion.' };
  }

  return null;
}
