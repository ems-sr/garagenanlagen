import { z } from 'zod';

export const createBoardMemberSchema = z.object({
  fullName: z.string().min(1, 'Name erforderlich'),
  role: z.string().min(1, 'Funktion erforderlich'),
  email: z.email('Ungültige E-Mail-Adresse').optional(),
  phone: z.string().optional(),
});

export const updateBoardMemberSchema = createBoardMemberSchema.partial();

export type CreateBoardMemberInput = z.infer<typeof createBoardMemberSchema>;
export type UpdateBoardMemberInput = z.infer<typeof updateBoardMemberSchema>;
