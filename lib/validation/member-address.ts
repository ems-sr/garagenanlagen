import { z } from 'zod';

export const addressTypeSchema = z.enum(['home', 'billing', 'other']);

export const createMemberAddressSchema = z.object({
  type: addressTypeSchema,
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});

export const updateMemberAddressSchema = createMemberAddressSchema.partial();

export type CreateMemberAddressInput = z.infer<typeof createMemberAddressSchema>;
export type UpdateMemberAddressInput = z.infer<typeof updateMemberAddressSchema>;
