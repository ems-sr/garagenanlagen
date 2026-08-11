import { z } from 'zod';

export const createWorkShiftSchema = z.object({
  title: z.string().trim().min(1, 'Titel erforderlich').max(200, 'Titel zu lang'),
  description: z.string().trim().max(1000, 'Beschreibung zu lang').optional(),
  date: z.coerce.date('Ungültiges Datum'),
  location: z.string().trim().max(200, 'Ort zu lang').optional(),
  facilityId: z.string().min(1).optional(),
  reimbursementUnit: z.enum(['hourly', 'fixed']).default('hourly'),
});

export const updateWorkShiftSchema = createWorkShiftSchema.partial();

export const addParticipantSchema = z.object({
  clubMemberId: z.string().min(1, 'Mitglied erforderlich'),
  hoursWorked: z.coerce.number('Ungültige Stundenzahl').positive('Stundenzahl muss größer als 0 sein'),
});

export const updateParticipantSchema = z.object({
  hoursWorked: z.coerce.number('Ungültige Stundenzahl').positive('Stundenzahl muss größer als 0 sein'),
});

export type CreateWorkShiftInput = z.infer<typeof createWorkShiftSchema>;
export type UpdateWorkShiftInput = z.infer<typeof updateWorkShiftSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;
