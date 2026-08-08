import { z } from 'zod';

export const createFacilitySchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});

export const updateFacilitySchema = createFacilitySchema.partial();

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
