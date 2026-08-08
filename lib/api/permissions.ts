import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { jsonError } from '@/lib/api/responses';

// Wraps auth.api.hasPermission (POST /organization/has-permission under the
// hood). Returns null when allowed, or a 403 NextResponse otherwise, so
// callers do: `const denied = await requirePermission(...); if (denied) return denied;`
export async function requirePermission(
  organizationId: string,
  permissions: Record<string, string[]>,
): Promise<NextResponse | null> {
  const result = await auth.api.hasPermission({
    headers: await headers(),
    body: { organizationId, permissions },
  });

  if (!result.success) {
    return jsonError(403, 'FORBIDDEN', 'Keine Berechtigung für diese Aktion.');
  }

  return null;
}
