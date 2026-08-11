import { db } from '@/prisma/db';
import { billingError, type BillingResult } from '@/lib/billing/types';
import { resolveReimbursementAmount } from './resolve-reimbursement-amount';

type Tx = { orm: typeof db.orm };
type ShiftParticipant = Awaited<ReturnType<typeof db.orm.public.ShiftParticipant.create>>;

// Re-resolves the rate effective on the shift's date and re-snapshots
// reimbursementAmount — same resolution as addParticipant, since correcting
// a logged hours value should recompute the amount the same way adding it
// fresh would. For `fixed`-unit shifts the hours correction doesn't change
// the resolved amount (resolveReimbursementAmount ignores hoursWorked for
// that unit), but re-resolving keeps this in one place rather than
// special-casing it here.
export async function updateParticipantHours(
  tx: Tx,
  organizationId: string,
  participantId: string,
  hoursWorked: number,
): Promise<BillingResult<ShiftParticipant>> {
  const existing = await tx.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).first();
  if (!existing) return billingError('NOT_FOUND', 'Teilnahme nicht gefunden.');
  if (existing.paidOut) return billingError('ALREADY_PAID_OUT', 'Bereits ausgezahlte Teilnahmen können nicht mehr geändert werden.');

  const workShift = await tx.orm.public.WorkShift.where({ id: existing.workShiftId, organizationId }).first();
  if (!workShift) return billingError('NOT_FOUND', 'Arbeitseinsatz nicht gefunden.');

  const resolved = await resolveReimbursementAmount(tx, organizationId, workShift, hoursWorked);
  if (!resolved.success) return resolved;

  const participant = await tx.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).update({
    hoursWorked: hoursWorked.toString(),
    reimbursementAmount: resolved.data,
  });
  if (!participant) return billingError('NOT_FOUND', 'Teilnahme nicht gefunden.');

  return { success: true, data: participant };
}
