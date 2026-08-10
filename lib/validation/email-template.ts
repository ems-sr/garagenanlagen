import { z } from 'zod';

export const createEmailTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name erforderlich').max(200, 'Name zu lang'),
  subject: z.string().trim().min(1, 'Betreff erforderlich').max(200, 'Betreff zu lang'),
  body: z.string().trim().min(1, 'Text erforderlich'),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial();

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
