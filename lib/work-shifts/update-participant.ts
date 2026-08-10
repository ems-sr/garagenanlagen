import { db } from '@/prisma/db';
import { billingError, type BillingResult } from '@/lib/billing/types';

type Tx = { orm: typeof db.orm };
type ShiftParticipant = Awaited<ReturnType<typeof db.orm.public.ShiftParticipant.create>>;

// Re-resolves the rate effective on the shift's date and re-snapshots
// reimbursementAmount — same resolution as addParticipant, since correcting
// a logged hours value should recompute the amount the same way adding it
// fresh would.
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

  const rates = await tx.orm.public.WorkShiftReimbursementRate.where({ organizationId }).all();
  const rate = rates.find((r) => r.validFrom <= workShift.date && (!r.validTo || r.validTo > workShift.date));
  if (!rate) return billingError('NO_RATE', 'Kein gültiger Aufwandsentschädigungssatz für dieses Datum hinterlegt.');

  const reimbursementAmount = Math.round(hoursWorked * rate.amountPerHour);

  const participant = await tx.orm.public.ShiftParticipant.where({ id: participantId, organizationId }).update({
    hoursWorked: hoursWorked.toString(),
    reimbursementAmount,
  });
  if (!participant) return billingError('NOT_FOUND', 'Teilnahme nicht gefunden.');

  return { success: true, data: participant };
}
