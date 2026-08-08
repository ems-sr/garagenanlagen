import { z } from 'zod';

// type has no "owner" value — a garage isn't legally owned by a club member,
// it's administratively assigned to one. 'member' is the base assignment;
// 'user' is an independent second row recording that the assigned member
// handed actual day-to-day use to someone else (only valid alongside an
// active 'member' row on the same garage — enforced via DB lookup in the
// route handler, not here); 'tenant' is a direct club-to-non-member rental
// bypassing the member layer entirely (mutually exclusive with 'member'/
// 'user' rows on the same garage — also a route-handler DB-lookup rule).
export const createGarageAssignmentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('member'),
    garageId: z.string().min(1, 'Garage erforderlich'),
    clubMemberId: z.string().min(1, 'Mitglied erforderlich'),
    validFrom: z.coerce.date('Ungültiges Startdatum').optional(),
  }),
  z.object({
    type: z.literal('user'),
    garageId: z.string().min(1, 'Garage erforderlich'),
    garageUserId: z.string().min(1, 'Nutzer erforderlich'),
    validFrom: z.coerce.date('Ungültiges Startdatum').optional(),
  }),
  z.object({
    type: z.literal('tenant'),
    garageId: z.string().min(1, 'Garage erforderlich'),
    tenantId: z.string().min(1, 'Mieter erforderlich'),
    validFrom: z.coerce.date('Ungültiges Startdatum').optional(),
  }),
]);

// An assignment's identity (type, party) isn't editable — closing it
// (validTo) and creating a new one is the correct workflow for a party
// change.
export const updateGarageAssignmentSchema = z.object({
  validTo: z.coerce.date('Ungültiges Enddatum').nullable().optional(),
});

export type CreateGarageAssignmentInput = z.infer<typeof createGarageAssignmentSchema>;
export type UpdateGarageAssignmentInput = z.infer<typeof updateGarageAssignmentSchema>;
