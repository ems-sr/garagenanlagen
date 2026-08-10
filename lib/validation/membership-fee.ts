import { z } from 'zod';

// amount is stored in cents (Int) — exact monetary arithmetic, matching
// PricePerKwh's convention.
export const createMembershipFeeSchema = z
  .object({
    description: z.string().trim().max(200, 'Bezeichnung zu lang').optional(),
    amount: z.coerce.number('Ungültiger Betrag').int('Betrag muss in Cent angegeben werden').positive('Betrag muss größer als 0 sein'),
    validFrom: z.coerce.date('Ungültiges Startdatum'),
    validTo: z.coerce.date('Ungültiges Enddatum').optional(),
  })
  .refine((data) => !data.validTo || data.validTo >= data.validFrom, {
    message: 'Enddatum darf nicht vor dem Startdatum liegen',
    path: ['validTo'],
  });

export const updateMembershipFeeSchema = z.object({
  validTo: z.coerce.date('Ungültiges Enddatum').nullable().optional(),
});

export type CreateMembershipFeeInput = z.infer<typeof createMembershipFeeSchema>;
export type UpdateMembershipFeeInput = z.infer<typeof updateMembershipFeeSchema>;
