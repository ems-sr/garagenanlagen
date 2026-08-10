import { z } from 'zod';

// amount is in cents (Int) — same convention as PricePerKwh/Invoice amounts.
export const createPaymentSchema = z.object({
  amount: z.coerce.number('Ungültiger Betrag').int('Betrag muss in Cent angegeben werden').positive('Betrag muss größer als 0 sein'),
  paidAt: z.coerce.date('Ungültiges Zahlungsdatum').optional(),
  method: z.string().optional(),
  note: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
