import { db } from '@/prisma/db';
import { billingError, type BillingResult } from '@/lib/billing/types';
import { resolveReimbursementAmount } from './resolve-reimbursement-amount';

type Tx = { orm: typeof db.orm };
type ShiftParticipant = Awaited<ReturnType<typeof db.orm.public.ShiftParticipant.create>>;

// Snapshots reimbursementAmount at add-time (resolveReimbursementAmount
// branches on the shift's reimbursementUnit) so a later rate change never
// alters an already-added participant's amount (same reasoning as
// Invoice.netAmount). Pre-checks for an existing (workShiftId, clubMemberId)
// row for a friendly error message — the @@unique constraint is
// defense-in-depth against a race, not the primary guard.
export async function addParticipant(
  tx: Tx,
  organizationId: string,
  workShiftId: string,
  clubMemberId: string,
  hoursWorked: number,
): Promise<BillingResult<ShiftParticipant>> {
  const workShift = await tx.orm.public.WorkShift.where({ id: workShiftId, organizationId }).first();
  if (!workShift) return billingError('NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  const member = await tx.orm.public.ClubMember.where({ id: clubMemberId, organizationId }).first();
  if (!member) return billingError('NOT_FOUND', 'Mitglied nicht gefunden.');

  const existing = await tx.orm.public.ShiftParticipant.where({ workShiftId, clubMemberId, organizationId }).first();
  if (existing) return billingError('ALREADY_PARTICIPATING', 'Mitglied ist diesem Arbeitseinsatz bereits zugeordnet.');

  const resolved = await resolveReimbursementAmount(tx, organizationId, workShift, hoursWorked);
  if (!resolved.success) return resolved;

  const participant = await tx.orm.public.ShiftParticipant.create({
    organizationId,
    workShiftId,
    clubMemberId,
    hoursWorked: hoursWorked.toString(),
    reimbursementAmount: resolved.data,
  });

  return { success: true, data: participant };
}
