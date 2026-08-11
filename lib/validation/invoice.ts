import { z } from 'zod';

// Creating an invoice means running the billing engine against a specific
// meter reading — there's no free-form Invoice creation, so this schema only
// carries the pointer the engine needs (see lib/billing/generate-invoice.ts).
export const createInvoiceSchema = z.object({
  meterReadingId: z.string().min(1, 'Zählerstand erforderlich'),
});

export const createBulkInvoicesSchema = z.object({
  facilityId: z.string().min(1, 'Garagenanlage erforderlich'),
});

// Bills one member's Mitgliedsbeitrag for [periodStart, periodEnd) for a
// single garage — see lib/billing/generate-membership-fee-invoice.ts. A
// member with multiple garages gets one invoice per garage (generated via
// generateBulkMembershipFeeInvoices, which loops over each of the member's
// active garage assignments), so garageId is required here rather than
// optional.
export const createMembershipFeeInvoiceSchema = z
  .object({
    clubMemberId: z.string().min(1, 'Mitglied erforderlich'),
    garageId: z.string().min(1, 'Garage erforderlich'),
    periodStart: z.coerce.date('Ungültiger Zeitraumbeginn'),
    periodEnd: z.coerce.date('Ungültiges Zeitraumende'),
  })
  .refine((data) => data.periodEnd > data.periodStart, {
    message: 'Zeitraumende muss nach dem Zeitraumbeginn liegen',
    path: ['periodEnd'],
  });

export const createBulkMembershipFeeInvoicesSchema = z
  .object({
    periodStart: z.coerce.date('Ungültiger Zeitraumbeginn'),
    periodEnd: z.coerce.date('Ungültiges Zeitraumende'),
  })
  .refine((data) => data.periodEnd > data.periodStart, {
    message: 'Zeitraumende muss nach dem Zeitraumbeginn liegen',
    path: ['periodEnd'],
  });

// Stage 5: free-form invoicing (custom line items) — see
// lib/billing/generate-custom-invoice.ts.
const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'Beschreibung erforderlich').max(200, 'Beschreibung zu lang'),
  quantity: z.coerce.number('Ungültige Menge').positive('Menge muss größer als 0 sein').default(1),
  unitPrice: z.coerce.number('Ungültiger Preis').int('Preis muss in Cent angegeben werden').positive('Preis muss größer als 0 sein'),
});

export const createCustomInvoiceSchema = z.object({
  clubMemberId: z.string().min(1, 'Mitglied erforderlich'),
  description: z.string().trim().max(200, 'Beschreibung zu lang').optional(),
  periodStart: z.coerce.date('Ungültiger Zeitraumbeginn').optional(),
  periodEnd: z.coerce.date('Ungültiges Zeitraumende').optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Mindestens eine Position erforderlich'),
});

// Invoices are financial records — the only supported edit via the API is
// canceling an unpaid one (see lib/billing/generate-invoice.ts callers);
// amounts/periods/status=open|paid are derived, not directly settable.
export const updateInvoiceSchema = z.object({
  status: z.literal('canceled', 'Nur eine Stornierung ist möglich'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateBulkInvoicesInput = z.infer<typeof createBulkInvoicesSchema>;
export type CreateMembershipFeeInvoiceInput = z.infer<typeof createMembershipFeeInvoiceSchema>;
export type CreateBulkMembershipFeeInvoicesInput = z.infer<typeof createBulkMembershipFeeInvoicesSchema>;
export type CreateCustomInvoiceInput = z.infer<typeof createCustomInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
