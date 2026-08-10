import { db } from '@/prisma/db';
import { billingError, type BillingResult } from '@/lib/billing/types';

type Tx = { orm: typeof db.orm };
type ShiftParticipant = Awaited<ReturnType<typeof db.orm.public.ShiftParticipant.create>>;

// Resolves the WorkShiftReimbursementRate effective on the shift's date (same
// validFrom <= date && (!validTo || validTo > date) JS-filter pattern
// lib/billing/generate-invoice.ts uses for PricePerKwh — no `or()`
// combinator in the query builder), snapshots reimbursementAmount at
// add-time so a later rate change never alters an already-added
// participant's amount (same reasoning as Invoice.netAmount). Pre-checks
// for an existing (workShiftId, clubMemberId) row for a friendly error
// message — the @@unique constraint is defense-in-depth against a race, not
// the primary guard.
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

  const rates = await tx.orm.public.WorkShiftReimbursementRate.where({ organizationId }).all();
  const rate = rates.find((r) => r.validFrom <= workShift.date && (!r.validTo || r.validTo > workShift.date));
  if (!rate) return billingError('NO_RATE', 'Kein gültiger Aufwandsentschädigungssatz für dieses Datum hinterlegt.');

  const reimbursementAmount = Math.round(hoursWorked * rate.amountPerHour);

  const participant = await tx.orm.public.ShiftParticipant.create({
    organizationId,
    workShiftId,
    clubMemberId,
    hoursWorked: hoursWorked.toString(),
    reimbursementAmount,
  });

  return { success: true, data: participant };
}
