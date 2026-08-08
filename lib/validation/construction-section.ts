import { z } from 'zod';

export const createConstructionSectionSchema = z.object({
  facilityId: z.string().min(1, 'Garagenanlage erforderlich'),
  name: z.string().min(1, 'Name erforderlich'),
});

export const updateConstructionSectionSchema = createConstructionSectionSchema.partial();

export type CreateConstructionSectionInput = z.infer<typeof createConstructionSectionSchema>;
export type UpdateConstructionSectionInput = z.infer<typeof updateConstructionSectionSchema>;
