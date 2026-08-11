import { z } from 'zod';

// amount is stored in cents (Int) — exact monetary arithmetic, matching
// PricePerKwh/MembershipFee/WorkShiftReimbursementRate's convention.
export const createWorkShiftDepositAmountSchema = z
  .object({
    amount: z.coerce.number('Ungültiger Betrag').int('Betrag muss in Cent angegeben werden').positive('Betrag muss größer als 0 sein'),
    validFrom: z.coerce.date('Ungültiges Startdatum'),
    validTo: z.coerce.date('Ungültiges Enddatum').optional(),
  })
  .refine((data) => !data.validTo || data.validTo >= data.validFrom, {
    message: 'Enddatum darf nicht vor dem Startdatum liegen',
    path: ['validTo'],
  });

export const updateWorkShiftDepositAmountSchema = z.object({
  validTo: z.coerce.date('Ungültiges Enddatum').nullable().optional(),
});

export type CreateWorkShiftDepositAmountInput = z.infer<typeof createWorkShiftDepositAmountSchema>;
export type UpdateWorkShiftDepositAmountInput = z.infer<typeof updateWorkShiftDepositAmountSchema>;
