import { z } from 'zod';

export const createBlockSchema = z.object({
  facilityId: z.string().min(1, 'Garagenanlage erforderlich'),
  constructionSectionId: z.string().optional(),
  name: z.string().min(1, 'Name erforderlich'),
});

export const updateBlockSchema = createBlockSchema.partial();

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
