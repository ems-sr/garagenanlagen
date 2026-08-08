import { z } from 'zod';

export const createTenantSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  email: z.email('Ungültige E-Mail-Adresse').optional(),
  phone: z.string().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
