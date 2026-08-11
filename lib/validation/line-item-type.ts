import { z } from 'zod';

// defaultAmount (cents) is only meaningful for amountSource=fixed — the
// rate-linked sources (membershipFeeRate/workShiftDepositRate) resolve their
// amount from MembershipFee/WorkShiftDepositAmount at generation time
// instead, so defaultAmount must be omitted for those.
export const createLineItemTypeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name erforderlich').max(200, 'Name zu lang'),
    description: z.string().trim().max(1000, 'Beschreibung zu lang').optional(),
    amountSource: z.enum(['fixed', 'membershipFeeRate', 'workShiftDepositRate']).default('fixed'),
    defaultAmount: z.coerce.number('Ungültiger Betrag').int('Betrag muss in Cent angegeben werden').positive('Betrag muss größer als 0 sein').optional(),
  })
  .refine((data) => data.amountSource !== 'fixed' || data.defaultAmount !== undefined, {
    message: 'Betrag erforderlich für Vergütungsart Fixbetrag',
    path: ['defaultAmount'],
  });

export const updateLineItemTypeSchema = createLineItemTypeSchema;

export type CreateLineItemTypeInput = z.infer<typeof createLineItemTypeSchema>;
export type UpdateLineItemTypeInput = z.infer<typeof updateLineItemTypeSchema>;
