import { z } from 'zod';

// pricePerKwh is stored in cents (Int) — exact monetary arithmetic, no
// floating-point drift, per architectural decision covering all money
// fields introduced in this stage.
export const createPricePerKwhSchema = z
  .object({
    facilityId: z.string().min(1, 'Garagenanlage erforderlich'),
    pricePerKwh: z.coerce.number('Ungültiger Preis').int('Preis muss in Cent angegeben werden').positive('Preis muss größer als 0 sein'),
    validFrom: z.coerce.date('Ungültiges Startdatum'),
    validTo: z.coerce.date('Ungültiges Enddatum').optional(),
  })
  .refine((data) => !data.validTo || data.validTo >= data.validFrom, {
    message: 'Enddatum darf nicht vor dem Startdatum liegen',
    path: ['validTo'],
  });

export const updatePricePerKwhSchema = z.object({
  validTo: z.coerce.date('Ungültiges Enddatum').nullable().optional(),
});

export type CreatePricePerKwhInput = z.infer<typeof createPricePerKwhSchema>;
export type UpdatePricePerKwhInput = z.infer<typeof updatePricePerKwhSchema>;
