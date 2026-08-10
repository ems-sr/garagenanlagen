import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError, zodError } from '@/lib/api/responses';
import { sendCorrespondenceSchema } from '@/lib/validation/correspondence';
import { sendCorrespondence } from '@/lib/email/send-correspondence';

// GET lists the CorrespondenceLog history (optionally filtered), POST sends
// — see lib/email/send-correspondence.ts for the single/allMembers/
// facilityMembers recipient modes.
export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { correspondence: ['read'] });
  if (denied) return denied;

  const clubMemberId = request.nextUrl.searchParams.get('clubMemberId');
  const facilityId = request.nextUrl.searchParams.get('facilityId');

  let query = db.orm.public.CorrespondenceLog.where({ organizationId });
  if (clubMemberId) query = query.where({ clubMemberId });
  if (facilityId) query = query.where({ facilityId });

  const items = await query.orderBy((log) => log.sentAt.desc()).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { correspondence: ['create'] });
  if (denied) return denied;

  const parsed = sendCorrespondenceSchema.safeParse(await request.json());
  if (!parsed.success) return zodError(parsed);

  const result = await sendCorrespondence(organizationId, parsed.data);
  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' || result.error.code === 'INVALID_FACILITY' ? 404 : 400;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data, { status: 201 });
}
