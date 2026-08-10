import { z } from 'zod';

// Query-string filters for the three Stage 7 PDF report routes — parsed from
// URLSearchParams (all values arrive as strings, hence z.coerce throughout).

export const memberListReportQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional(),
  facilityId: z.string().min(1).optional(),
});

export const financialReportQuerySchema = z
  .object({
    dateFrom: z.coerce.date('Ungültiges Startdatum'),
    dateTo: z.coerce.date('Ungültiges Enddatum'),
    facilityId: z.string().min(1).optional(),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'Enddatum muss nach dem Startdatum liegen',
    path: ['dateTo'],
  });

export const invoiceRunReportQuerySchema = z
  .object({
    dateFrom: z.coerce.date('Ungültiges Startdatum'),
    dateTo: z.coerce.date('Ungültiges Enddatum'),
    facilityId: z.string().min(1).optional(),
    type: z.enum(['consumption', 'membershipFee', 'custom'], 'Ungültiger Rechnungstyp').optional(),
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: 'Enddatum muss nach dem Startdatum liegen',
    path: ['dateTo'],
  });

export type MemberListReportQuery = z.infer<typeof memberListReportQuerySchema>;
export type FinancialReportQuery = z.infer<typeof financialReportQuerySchema>;
export type InvoiceRunReportQuery = z.infer<typeof invoiceRunReportQuerySchema>;
