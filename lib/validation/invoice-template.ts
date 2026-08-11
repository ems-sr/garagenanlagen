import { z } from 'zod';

// Only membershipFee/custom invoices carry line items (type=consumption
// invoices keep their amount directly on Invoice — see the note above
// Invoice in contract.prisma), so a template can only target those two.
export const invoiceTemplateLineItemSchema = z.object({
  lineItemTypeId: z.string().min(1, 'Rechnungsposten-Typ erforderlich'),
  quantity: z.coerce.number('Ungültige Menge').positive('Menge muss größer als 0 sein').default(1),
  overrideAmount: z.coerce.number('Ungültiger Betrag').int('Betrag muss in Cent angegeben werden').positive('Betrag muss größer als 0 sein').optional(),
});

export const createInvoiceTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name erforderlich').max(200, 'Name zu lang'),
  invoiceType: z.enum(['membershipFee', 'custom']),
  autoGenerate: z.boolean().default(false),
  lineItems: z.array(invoiceTemplateLineItemSchema).min(1, 'Mindestens ein Rechnungsposten erforderlich'),
});

export const updateInvoiceTemplateSchema = createInvoiceTemplateSchema;

export type InvoiceTemplateLineItemInput = z.infer<typeof invoiceTemplateLineItemSchema>;
export type CreateInvoiceTemplateInput = z.infer<typeof createInvoiceTemplateSchema>;
export type UpdateInvoiceTemplateInput = z.infer<typeof updateInvoiceTemplateSchema>;
