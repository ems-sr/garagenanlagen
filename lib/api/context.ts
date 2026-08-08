import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth, type Session } from '@/lib/auth';
import { jsonError } from '@/lib/api/responses';

// Every Stage 2+ route handler starts with getRequestContext(): it resolves
// the session and the active organization once, so route bodies stay
// explicit (`if ('error' in ctx) return ctx.error;`) instead of hiding auth
// control flow in a try/catch.
type RequestContext = { session: Session; organizationId: string };
type RequestContextResult = RequestContext | { error: NextResponse };

export async function getRequestContext(): Promise<RequestContextResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { error: jsonError(401, 'UNAUTHENTICATED', 'Nicht angemeldet.') };
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return { error: jsonError(400, 'NO_ACTIVE_ORGANIZATION', 'Keine aktive Organisation ausgewählt.') };
  }

  return { session, organizationId };
}
