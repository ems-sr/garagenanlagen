import { z } from 'zod';

// Manual "Notiz hinzufügen" entries only — assignmentStarted/assignmentEnded
// rows are system-written (lib/garages/usage-events.ts), not exposed for
// direct creation.
export const createUsageNoteSchema = z.object({
  description: z.string().trim().min(1, 'Beschreibung erforderlich').max(1000, 'Beschreibung zu lang'),
  clubMemberId: z.string().min(1).optional(),
});

export type CreateUsageNoteInput = z.infer<typeof createUsageNoteSchema>;
