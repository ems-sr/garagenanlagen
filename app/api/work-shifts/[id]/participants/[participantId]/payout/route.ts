import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/prisma/db';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { jsonError } from '@/lib/api/responses';
import { recordPayout } from '@/lib/work-shifts/record-payout';

type RouteParams = { params: Promise<{ id: string; participantId: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { workShift: ['update'] });
  if (denied) return denied;

  const { participantId } = await params;
  const result = await db.transaction((tx) => recordPayout(tx, organizationId, participantId));

  if (!result.success) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 409;
    return jsonError(status, result.error.code, result.error.message);
  }

  return NextResponse.json(result.data);
}
