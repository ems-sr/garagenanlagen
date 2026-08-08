import { z } from 'zod';

export const createGarageSchema = z
  .object({
    facilityId: z.string().min(1, 'Garagenanlage erforderlich'),
    constructionSectionId: z.string().optional(),
    blockId: z.string().optional(),
    number: z.string().min(1, 'Garagennummer erforderlich'),
    type: z.enum(['single', 'double'], 'Ungültiger Garagentyp'),
    meterNumber: z.string().optional(),
    // null = explicitly clear the pairing (propagated to the other side —
    // see lib/garage-neighbor.ts); undefined = leave unchanged.
    neighborGarageId: z.string().optional().nullable(),
  })
  .refine((data) => !(data.constructionSectionId && data.blockId), {
    message: 'Garage darf nicht gleichzeitig einem Bauabschnitt und einem Trakt zugeordnet sein',
    path: ['blockId'],
  })
  .refine((data) => !data.neighborGarageId || data.type === 'double', {
    message: 'Nur Doppelgaragen können eine Nachbargarage haben',
    path: ['neighborGarageId'],
  });

export const updateGarageSchema = z
  .object({
    facilityId: z.string().min(1, 'Garagenanlage erforderlich').optional(),
    constructionSectionId: z.string().optional(),
    blockId: z.string().optional(),
    number: z.string().min(1, 'Garagennummer erforderlich').optional(),
    type: z.enum(['single', 'double'], 'Ungültiger Garagentyp').optional(),
    meterNumber: z.string().optional(),
    // null = explicitly clear the pairing (propagated to the other side —
    // see lib/garage-neighbor.ts); undefined = leave unchanged.
    neighborGarageId: z.string().optional().nullable(),
  })
  .refine((data) => !(data.constructionSectionId && data.blockId), {
    message: 'Garage darf nicht gleichzeitig einem Bauabschnitt und einem Trakt zugeordnet sein',
    path: ['blockId'],
  })
  .refine((data) => !data.neighborGarageId || data.type === undefined || data.type === 'double', {
    message: 'Nur Doppelgaragen können eine Nachbargarage haben',
    path: ['neighborGarageId'],
  });

export type CreateGarageInput = z.infer<typeof createGarageSchema>;
export type UpdateGarageInput = z.infer<typeof updateGarageSchema>;
