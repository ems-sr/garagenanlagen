import { z } from 'zod';

export const createMeterReadingSchema = z.object({
  garageId: z.string().min(1, 'Garage erforderlich'),
  readingDate: z.coerce.date('Ungültiges Ablesedatum'),
  value: z.coerce.number('Ungültiger Zählerstand').nonnegative('Zählerstand darf nicht negativ sein'),
  note: z.string().optional(),
});

export const updateMeterReadingSchema = z.object({
  readingDate: z.coerce.date('Ungültiges Ablesedatum').optional(),
  value: z.coerce.number('Ungültiger Zählerstand').nonnegative('Zählerstand darf nicht negativ sein').optional(),
  note: z.string().nullable().optional(),
});

export type CreateMeterReadingInput = z.infer<typeof createMeterReadingSchema>;
export type UpdateMeterReadingInput = z.infer<typeof updateMeterReadingSchema>;
