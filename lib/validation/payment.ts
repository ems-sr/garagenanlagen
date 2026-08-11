import { z } from 'zod';

// amount is in cents (Int) — same convention as PricePerKwh/Invoice amounts.
// Either sign is allowed here: a normal payment is positive, a repayment
// against a creditNote invoice is negative (zero is meaningless either way).
// The sign must additionally match the target invoice's type — that check
// lives in lib/billing/record-payment.ts, not here, since this schema has
// no access to the invoice being paid.
export const createPaymentSchema = z.object({
  amount: z.coerce
    .number('Ungültiger Betrag')
    .int('Betrag muss in Cent angegeben werden')
    .refine((v) => v !== 0, 'Betrag darf nicht 0 sein'),
  paidAt: z.coerce.date('Ungültiges Zahlungsdatum').optional(),
  method: z.string().optional(),
  note: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
