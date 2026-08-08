import { z } from 'zod';

export const createGarageUserSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  email: z.email('Ungültige E-Mail-Adresse').optional(),
  phone: z.string().optional(),
});

export const updateGarageUserSchema = createGarageUserSchema.partial();

export type CreateGarageUserInput = z.infer<typeof createGarageUserSchema>;
export type UpdateGarageUserInput = z.infer<typeof updateGarageUserSchema>;
