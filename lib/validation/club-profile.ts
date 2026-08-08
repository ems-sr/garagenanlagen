import { z } from 'zod';

// A single ClubProfile row exists per organization (upserted), so there's no
// separate create schema — every field is independently optional/updatable.
export const updateClubProfileSchema = z.object({
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  bankIban: z.string().optional(),
  bankBic: z.string().optional(),
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  contactEmail: z.email('Ungültige E-Mail-Adresse').optional(),
  contactPhone: z.string().optional(),
});

export type UpdateClubProfileInput = z.infer<typeof updateClubProfileSchema>;
