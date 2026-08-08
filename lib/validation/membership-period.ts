import { z } from 'zod';

export const createMembershipPeriodSchema = z
  .object({
    startDate: z.coerce.date('Ungültiges Startdatum'),
    endDate: z.coerce.date('Ungültiges Enddatum').optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'Enddatum darf nicht vor dem Startdatum liegen',
    path: ['endDate'],
  });

export const updateMembershipPeriodSchema = z
  .object({
    startDate: z.coerce.date('Ungültiges Startdatum').optional(),
    endDate: z.coerce.date('Ungültiges Enddatum').nullable().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'Enddatum darf nicht vor dem Startdatum liegen',
    path: ['endDate'],
  });

export type CreateMembershipPeriodInput = z.infer<typeof createMembershipPeriodSchema>;
export type UpdateMembershipPeriodInput = z.infer<typeof updateMembershipPeriodSchema>;
