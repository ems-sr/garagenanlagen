import { z } from 'zod';

// amountPerHour is stored in cents (Int) — exact monetary arithmetic,
// matching PricePerKwh/MembershipFee's convention.
export const createWorkShiftRateSchema = z
  .object({
    amountPerHour: z.coerce.number('Ungültiger Betrag').int('Betrag muss in Cent angegeben werden').positive('Betrag muss größer als 0 sein'),
    validFrom: z.coerce.date('Ungültiges Startdatum'),
    validTo: z.coerce.date('Ungültiges Enddatum').optional(),
  })
  .refine((data) => !data.validTo || data.validTo >= data.validFrom, {
    message: 'Enddatum darf nicht vor dem Startdatum liegen',
    path: ['validTo'],
  });

export const updateWorkShiftRateSchema = z.object({
  validTo: z.coerce.date('Ungültiges Enddatum').nullable().optional(),
});

export type CreateWorkShiftRateInput = z.infer<typeof createWorkShiftRateSchema>;
export type UpdateWorkShiftRateInput = z.infer<typeof updateWorkShiftRateSchema>;
