import { z } from 'zod';

export const createClubMemberSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
});

export const updateClubMemberSchema = createClubMemberSchema.partial();

export type CreateClubMemberInput = z.infer<typeof createClubMemberSchema>;
export type UpdateClubMemberInput = z.infer<typeof updateClubMemberSchema>;
