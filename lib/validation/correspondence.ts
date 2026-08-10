import { z } from 'zod';

// Either pick a saved template (templateId) or supply subject+body directly
// — enforced by the first refine below, since the contract's
// EmailTemplate/CorrespondenceLog relation is optional either way.
export const sendCorrespondenceSchema = z
  .object({
    recipientMode: z.enum(['member', 'allMembers', 'facilityMembers'], 'Ungültiger Empfängerkreis'),
    clubMemberId: z.string().min(1).optional(),
    facilityId: z.string().min(1).optional(),
    templateId: z.string().min(1).optional(),
    subject: z.string().trim().min(1, 'Betreff erforderlich').max(200, 'Betreff zu lang').optional(),
    body: z.string().trim().min(1, 'Text erforderlich').optional(),
  })
  .refine((data) => !!data.templateId || (!!data.subject && !!data.body), {
    message: 'Vorlage oder Betreff und Text erforderlich',
    path: ['templateId'],
  })
  .refine((data) => data.recipientMode !== 'member' || !!data.clubMemberId, {
    message: 'Mitglied erforderlich',
    path: ['clubMemberId'],
  })
  .refine((data) => data.recipientMode !== 'facilityMembers' || !!data.facilityId, {
    message: 'Garagenanlage erforderlich',
    path: ['facilityId'],
  });

export type SendCorrespondenceInput = z.infer<typeof sendCorrespondenceSchema>;
