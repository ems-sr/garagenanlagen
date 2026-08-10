'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { sendCorrespondenceAction } from '@/app/(app)/_actions/correspondence';
import { sendCorrespondenceSchema } from '@/lib/validation/correspondence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react';

type Template = { id: string; name: string; subject: string; body: string };
type RecipientMode = 'member' | 'allMembers' | 'facilityMembers';

const NO_TEMPLATE = '__custom__';

// Two shapes, discriminated on `scope`: a fixed-member send (from a member's
// Korrespondenz tab, no recipient picker) and an org-wide send (from
// /korrespondenz, full recipientMode picker) — see
// lib/email/send-correspondence.ts for what each recipientMode resolves to
// server-side.
type Props =
  | { scope: 'fixedMember'; fixedClubMemberId: string; templates: Template[]; trigger?: React.ReactNode }
  | {
      scope: 'org';
      templates: Template[];
      members: { id: string; name: string }[];
      facilities: { id: string; name: string }[];
      trigger?: React.ReactNode;
    };

export function SendCorrespondenceDialog(props: Props) {
  useSignals();
  const router = useRouter();
  const fixedClubMemberId = props.scope === 'fixedMember' ? props.fixedClubMemberId : undefined;
  const open = useSignal(false);
  const recipientMode = useSignal<RecipientMode>(fixedClubMemberId ? 'member' : 'allMembers');
  const clubMemberId = useSignal('');
  const facilityId = useSignal('');
  const templateId = useSignal(NO_TEMPLATE);
  const subject = useSignal('');
  const body = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function applyTemplate(id: string) {
    templateId.value = id;
    if (id === NO_TEMPLATE) return;
    const template = props.templates.find((t) => t.id === id);
    if (template) {
      subject.value = template.subject;
      body.value = template.body;
    }
  }

  function reset() {
    recipientMode.value = fixedClubMemberId ? 'member' : 'allMembers';
    clubMemberId.value = '';
    facilityId.value = '';
    templateId.value = NO_TEMPLATE;
    subject.value = '';
    body.value = '';
    errors.value = {};
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      recipientMode: recipientMode.value,
      clubMemberId: fixedClubMemberId ?? (recipientMode.value === 'member' ? clubMemberId.value : undefined),
      facilityId: recipientMode.value === 'facilityMembers' ? facilityId.value : undefined,
      templateId: templateId.value === NO_TEMPLATE ? undefined : templateId.value,
      subject: templateId.value === NO_TEMPLATE ? subject.value : undefined,
      body: templateId.value === NO_TEMPLATE ? body.value : undefined,
    };
    const result = sendCorrespondenceSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await sendCorrespondenceAction(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Versand fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    const { logs, skipped } = actionResult.data;
    const failedCount = logs.filter((log) => log.status === 'failed').length;
    const sentCount = logs.length - failedCount;
    toast.add({
      title: `${sentCount} E-Mail(s) versendet`,
      description: [failedCount > 0 ? `${failedCount} fehlgeschlagen` : null, skipped.length > 0 ? `${skipped.length} ohne E-Mail-Adresse übersprungen` : null]
        .filter(Boolean)
        .join(' · ') || undefined,
      type: sentCount > 0 ? 'success' : 'error',
    });
    open.value = false;
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open.value}
      onOpenChange={(next) => {
        open.value = next;
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          (props.trigger as React.ReactElement) ?? (
            <Button size="sm">
              <EnvelopeSimpleIcon data-icon="inline-start" />
              E-Mail senden
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>E-Mail senden</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {props.scope === 'org' && (
              <>
                <Field data-invalid={!!errors.value.recipientMode}>
                  <FieldLabel htmlFor="recipientMode">Empfänger</FieldLabel>
                  <Select value={recipientMode.value} onValueChange={(value) => (recipientMode.value = (value ?? 'allMembers') as RecipientMode)}>
                    <SelectTrigger id="recipientMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="allMembers">Alle Mitglieder</SelectItem>
                        <SelectItem value="facilityMembers">Mitglieder einer Garagenanlage</SelectItem>
                        <SelectItem value="member">Einzelnes Mitglied</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                {recipientMode.value === 'member' && (
                  <Field data-invalid={!!errors.value.clubMemberId}>
                    <FieldLabel htmlFor="recipientMember">Mitglied</FieldLabel>
                    <Select value={clubMemberId.value} onValueChange={(value) => (clubMemberId.value = value ?? '')}>
                      <SelectTrigger id="recipientMember">
                        <SelectValue placeholder="Mitglied auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {props.members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.value.clubMemberId && <FieldError errors={[{ message: errors.value.clubMemberId }]} />}
                  </Field>
                )}
                {recipientMode.value === 'facilityMembers' && (
                  <Field data-invalid={!!errors.value.facilityId}>
                    <FieldLabel htmlFor="recipientFacility">Garagenanlage</FieldLabel>
                    <Select value={facilityId.value} onValueChange={(value) => (facilityId.value = value ?? '')}>
                      <SelectTrigger id="recipientFacility">
                        <SelectValue placeholder="Garagenanlage auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {props.facilities.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id}>
                              {facility.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.value.facilityId && <FieldError errors={[{ message: errors.value.facilityId }]} />}
                  </Field>
                )}
              </>
            )}
            <Field>
              <FieldLabel htmlFor="templateSelect">Vorlage</FieldLabel>
              <Select value={templateId.value} onValueChange={(value) => applyTemplate(value ?? NO_TEMPLATE)}>
                <SelectTrigger id="templateSelect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NO_TEMPLATE}>Freier Text</SelectItem>
                    {props.templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!errors.value.templateId}>
              <FieldLabel htmlFor="correspondenceSubject">Betreff</FieldLabel>
              <Input
                id="correspondenceSubject"
                value={subject.value}
                onChange={(e) => (subject.value = e.target.value)}
                disabled={templateId.value !== NO_TEMPLATE}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="correspondenceBody">Text</FieldLabel>
              <Textarea
                id="correspondenceBody"
                rows={6}
                value={body.value}
                onChange={(e) => (body.value = e.target.value)}
                disabled={templateId.value !== NO_TEMPLATE}
              />
              {errors.value.templateId && <FieldError errors={[{ message: errors.value.templateId }]} />}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting.value}>
              Senden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
