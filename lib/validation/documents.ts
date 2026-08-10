import { z } from 'zod';

// File presence/size/mimetype are checked as plain code in the route
// handler/action, not here — no File/Blob precedent exists yet in this
// codebase's zod schemas, and those checks don't map cleanly onto zod.
export const uploadDocumentSchema = z.object({
  clubMemberId: z.string().min(1).optional(),
  facilityId: z.string().min(1).optional(),
  description: z.string().trim().max(1000, 'Beschreibung zu lang').optional(),
});

// Metadata only — content/fileName/mimeType/fileSize are immutable after
// upload (see prisma/contract.prisma's Document model comment); replacing a
// file's binary content means delete + re-upload.
export const updateDocumentSchema = z.object({
  clubMemberId: z.string().min(1).nullable().optional(),
  facilityId: z.string().min(1).nullable().optional(),
  description: z.string().trim().max(1000, 'Beschreibung zu lang').nullable().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
