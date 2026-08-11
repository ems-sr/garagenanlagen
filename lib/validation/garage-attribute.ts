import { z } from 'zod';

export const createAttributeTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name erforderlich').max(200, 'Name zu lang'),
  dataType: z.enum(['text', 'number', 'boolean'], 'Ungültiger Datentyp'),
  unit: z.string().trim().max(20, 'Einheit zu lang').optional(),
});

export const updateAttributeTypeSchema = createAttributeTypeSchema.partial();

// value is validated for shape here; the dataType-specific check (does the
// value actually parse as a number/boolean for its attribute type) needs a
// DB lookup of the attribute type first, so it happens in
// lib/garages/attribute-assignment.ts, not here — same split Stage 2 used
// for GarageAssignment's cross-row business rules.
export const upsertAttributeAssignmentSchema = z.object({
  attributeTypeId: z.string().min(1, 'Attributtyp erforderlich'),
  value: z.string().trim().min(1, 'Wert erforderlich').max(500, 'Wert zu lang'),
});

export type CreateAttributeTypeInput = z.infer<typeof createAttributeTypeSchema>;
export type UpdateAttributeTypeInput = z.infer<typeof updateAttributeTypeSchema>;
export type UpsertAttributeAssignmentInput = z.infer<typeof upsertAttributeAssignmentSchema>;
