import { db } from '@/prisma/db';
import { correspondenceError, type CorrespondenceResult, type CorrespondenceError } from './types';
import { sendEmail } from './send-email';
import { renderTemplate } from './render-template';
import type { SendCorrespondenceInput } from '@/lib/validation/correspondence';

type ClubMember = Awaited<ReturnType<typeof db.orm.public.ClubMember.create>>;
type CorrespondenceLog = Awaited<ReturnType<typeof db.orm.public.CorrespondenceLog.create>>;

export type SendCorrespondenceResult = {
  logs: CorrespondenceLog[];
  skipped: { clubMemberId: string; error: CorrespondenceError }[];
};

// Single entry point for every send flow (one member, all members, or every
// member with an active `member`-type GarageAssignment in one Facility) —
// callers (Server Action + REST route) don't need to know the difference.
// Never rolled back in a transaction: a partial batch (some sent, some
// failed, some skipped for missing email) is the expected, useful outcome,
// not an error state — mirrors Stage 4/5's bulk invoice generation, which
// also reports per-item outcomes instead of failing the whole run.
export async function sendCorrespondence(
  organizationId: string,
  input: SendCorrespondenceInput,
): Promise<CorrespondenceResult<SendCorrespondenceResult>> {
  const content = await resolveContent(organizationId, input);
  if (!content.success) return content;

  const recipients = await resolveRecipients(organizationId, input);
  if (!recipients.success) return recipients;

  const logs: CorrespondenceLog[] = [];
  const skipped: { clubMemberId: string; error: CorrespondenceError }[] = [];

  for (const member of recipients.data) {
    if (!member.email) {
      skipped.push({ clubMemberId: member.id, error: { code: 'NO_EMAIL', message: 'Mitglied hat keine E-Mail-Adresse hinterlegt.' } });
      continue;
    }

    const placeholders = { firstName: member.firstName, lastName: member.lastName, email: member.email };
    const subject = renderTemplate(content.data.subject, placeholders);
    const body = renderTemplate(content.data.body, placeholders);

    const sendResult = await sendEmail({ to: member.email, subject, text: body });

    const log = await db.orm.public.CorrespondenceLog.create({
      organizationId,
      facilityId: input.recipientMode === 'facilityMembers' ? input.facilityId : undefined,
      clubMemberId: member.id,
      templateId: content.data.templateId,
      recipientEmail: member.email,
      subject,
      body,
      status: sendResult.success ? 'sent' : 'failed',
      errorMessage: sendResult.success ? undefined : sendResult.error,
    });

    logs.push(log);
  }

  return { success: true, data: { logs, skipped } };
}

async function resolveContent(
  organizationId: string,
  input: SendCorrespondenceInput,
): Promise<CorrespondenceResult<{ subject: string; body: string; templateId?: string }>> {
  if (input.templateId) {
    const template = await db.orm.public.EmailTemplate.where({ id: input.templateId, organizationId }).first();
    if (!template) return correspondenceError('NOT_FOUND', 'Vorlage nicht gefunden.');
    return { success: true, data: { subject: template.subject, body: template.body, templateId: template.id } };
  }

  // Schema-enforced: subject/body are both present when templateId isn't.
  return { success: true, data: { subject: input.subject!, body: input.body! } };
}

async function resolveRecipients(organizationId: string, input: SendCorrespondenceInput): Promise<CorrespondenceResult<ClubMember[]>> {
  if (input.recipientMode === 'member') {
    const member = await db.orm.public.ClubMember.where({ id: input.clubMemberId!, organizationId }).first();
    if (!member) return correspondenceError('NOT_FOUND', 'Mitglied nicht gefunden.');
    return { success: true, data: [member] };
  }

  if (input.recipientMode === 'allMembers') {
    const members = await db.orm.public.ClubMember.where({ organizationId }).all();
    return { success: true, data: members };
  }

  const facility = await db.orm.public.Facility.where({ id: input.facilityId!, organizationId }).first();
  if (!facility) return correspondenceError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  const garages = await db.orm.public.Garage.where({ organizationId, facilityId: facility.id }).all();
  const garageIds = new Set(garages.map((garage) => garage.id));

  const assignments = await db.orm.public.GarageAssignment.where({ organizationId, type: 'member' })
    .where((a) => a.validTo.isNull())
    .all();
  const clubMemberIds = new Set(
    assignments.filter((assignment) => garageIds.has(assignment.garageId) && assignment.clubMemberId).map((assignment) => assignment.clubMemberId!),
  );

  const members = await db.orm.public.ClubMember.where({ organizationId }).all();
  return { success: true, data: members.filter((member) => clubMemberIds.has(member.id)) };
}
