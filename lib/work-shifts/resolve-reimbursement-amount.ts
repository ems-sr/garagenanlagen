import { db } from '@/prisma/db';
import { billingError, type BillingResult } from '@/lib/billing/types';

type Tx = { orm: typeof db.orm };
type WorkShift = Awaited<ReturnType<typeof db.orm.public.WorkShift.create>>;

// Resolves the reimbursement amount for a participant, branching on the
// shift's reimbursementUnit: `hourly` reimburses hoursWorked x the
// WorkShiftReimbursementRate effective on the shift's date (Stage 8
// behavior); `fixed` instead reimburses the WorkShiftDepositAmount effective
// on the shift's date, ignoring hoursWorked — the "deposit refunded in full"
// rule. Both branches resolve their rate table the same
// `validFrom <= date && (!validTo || validTo > date)` JS-filter way (no
// `or()` combinator in the query builder), and the caller snapshots the
// result the same way add/updateParticipant always have, so a later rate
// change never alters an already-added participant's amount.
export async function resolveReimbursementAmount(
  tx: Tx,
  organizationId: string,
  workShift: WorkShift,
  hoursWorked: number,
): Promise<BillingResult<number>> {
  if (workShift.reimbursementUnit === 'fixed') {
    const amounts = await tx.orm.public.WorkShiftDepositAmount.where({ organizationId }).all();
    const amount = amounts.find((a) => a.validFrom <= workShift.date && (!a.validTo || a.validTo > workShift.date));
    if (!amount) return billingError('NO_RATE', 'Kein gültiger Kautionsbetrag für dieses Datum hinterlegt.');
    return { success: true, data: amount.amount };
  }

  const rates = await tx.orm.public.WorkShiftReimbursementRate.where({ organizationId }).all();
  const rate = rates.find((r) => r.validFrom <= workShift.date && (!r.validTo || r.validTo > workShift.date));
  if (!rate) return billingError('NO_RATE', 'Kein gültiger Aufwandsentschädigungssatz für dieses Datum hinterlegt.');
  return { success: true, data: Math.round(hoursWorked * rate.amountPerHour) };
}
