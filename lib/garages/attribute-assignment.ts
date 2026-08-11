import { db } from '@/prisma/db';
import { garageError, type GarageResult } from '@/lib/garages/types';

type AttributeAssignment = Awaited<ReturnType<typeof db.orm.public.GarageAttributeAssignment.create>>;

function validateValueForDataType(dataType: string, value: string): string | null {
  if (dataType === 'number') {
    return Number.isFinite(Number(value)) ? null : 'Wert muss eine Zahl sein.';
  }
  if (dataType === 'boolean') {
    return value === 'true' || value === 'false' ? null : "Wert muss 'true' oder 'false' sein.";
  }
  return null;
}

// Upsert semantics: one row per (garage, attributeType), created on first
// save and updated afterward — the UI always presents one input per defined
// attribute type, never a separate "add"/"edit" step. dataType-specific
// validation needs the attribute type's row, hence the DB lookup here
// rather than in the zod schema (same split Stage 2 used for
// GarageAssignment's cross-row business rules).
export async function upsertAttributeAssignment(
  organizationId: string,
  garageId: string,
  attributeTypeId: string,
  value: string,
): Promise<GarageResult<AttributeAssignment>> {
  const garage = await db.orm.public.Garage.where({ id: garageId, organizationId }).first();
  if (!garage) return garageError('NOT_FOUND', 'Garage nicht gefunden.');

  const attributeType = await db.orm.public.GarageAttributeType.where({ id: attributeTypeId, organizationId }).first();
  if (!attributeType) return garageError('NOT_FOUND', 'Attributtyp nicht gefunden.');

  const validationError = validateValueForDataType(attributeType.dataType, value);
  if (validationError) return garageError('INVALID_VALUE', validationError);

  const existing = await db.orm.public.GarageAttributeAssignment.where({ garageId, attributeTypeId, organizationId }).first();

  const assignment = existing
    ? await db.orm.public.GarageAttributeAssignment.where({ id: existing.id, organizationId }).update({ value })
    : await db.orm.public.GarageAttributeAssignment.create({ organizationId, garageId, attributeTypeId, value });

  return { success: true, data: assignment! };
}
