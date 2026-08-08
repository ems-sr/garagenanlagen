'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { updateMember } from '@/app/(app)/_actions/members';
import { createClubMemberSchema } from '@/lib/validation/club-member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PencilSimpleIcon } from '@phosphor-icons/react';

type FormValues = { firstName: string; lastName: string };

export function MemberNameEditor({ memberId, initialValues }: { memberId: string; initialValues: FormValues }) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const values = useSignal<FormValues>(initialValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    values.value = { ...values.value, [key]: value };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createClubMemberSchema.safeParse(values.value);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await updateMember(memberId, result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Mitglied aktualisiert', type: 'success' });
    open.value = false;
    router.refresh();
  }

  return (
    <Dialog
      open={open.value}
      onOpenChange={(next) => {
        open.value = next;
        if (next) values.value = initialValues;
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PencilSimpleIcon data-icon="inline-start" />
            Bearbeiten
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mitglied bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field orientation="responsive" data-invalid={!!errors.value.firstName}>
              <FieldLabel htmlFor="editFirstName" className="@md/field-group:w-28! @md/field-group:flex-none!">
                Vorname
              </FieldLabel>
              <FieldContent>
                <Input
                  id="editFirstName"
                  value={values.value.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  aria-invalid={!!errors.value.firstName}
                />
                {errors.value.firstName && <FieldError errors={[{ message: errors.value.firstName }]} />}
              </FieldContent>
            </Field>
            <Field orientation="responsive" data-invalid={!!errors.value.lastName}>
              <FieldLabel htmlFor="editLastName" className="@md/field-group:w-28! @md/field-group:flex-none!">
                Nachname
              </FieldLabel>
              <FieldContent>
                <Input
                  id="editLastName"
                  value={values.value.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  aria-invalid={!!errors.value.lastName}
                />
                {errors.value.lastName && <FieldError errors={[{ message: errors.value.lastName }]} />}
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting.value}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
