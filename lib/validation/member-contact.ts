import { z } from 'zod';

export const contactTypeSchema = z.enum(['email', 'phone', 'mobile', 'fax', 'other']);

export const createMemberContactSchema = z.object({
  type: contactTypeSchema,
  value: z.string().min(1, 'Wert erforderlich'),
});

export const updateMemberContactSchema = createMemberContactSchema.partial();

export type CreateMemberContactInput = z.infer<typeof createMemberContactSchema>;
export type UpdateMemberContactInput = z.infer<typeof updateMemberContactSchema>;
