'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createMember } from '@/app/(app)/_actions/members';
import { createClubMemberSchema } from '@/lib/validation/club-member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

type MemberValues = {
  firstName: string;
  lastName: string;
};

const emptyValues: MemberValues = {
  firstName: '',
  lastName: '',
};

export function MemberForm() {
  useSignals();
  const router = useRouter();
  const values = useSignal<MemberValues>(emptyValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function setField<K extends keyof MemberValues>(key: K, value: MemberValues[K]) {
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

    const actionResult = await createMember(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Mitglied angelegt', type: 'success' });
    router.push(`/mitglieder/${actionResult.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field orientation="responsive" data-invalid={!!errors.value.firstName}>
          <FieldLabel htmlFor="firstName" className="@md/field-group:w-28! @md/field-group:flex-none!">
            Vorname
          </FieldLabel>
          <FieldContent>
            <Input
              id="firstName"
              value={values.value.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              aria-invalid={!!errors.value.firstName}
            />
            {errors.value.firstName && <FieldError errors={[{ message: errors.value.firstName }]} />}
          </FieldContent>
        </Field>
        <Field orientation="responsive" data-invalid={!!errors.value.lastName}>
          <FieldLabel htmlFor="lastName" className="@md/field-group:w-28! @md/field-group:flex-none!">
            Nachname
          </FieldLabel>
          <FieldContent>
            <Input
              id="lastName"
              value={values.value.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              aria-invalid={!!errors.value.lastName}
            />
            {errors.value.lastName && <FieldError errors={[{ message: errors.value.lastName }]} />}
          </FieldContent>
        </Field>
        <Button type="submit" disabled={isSubmitting.value}>
          Speichern
        </Button>
      </FieldGroup>
    </form>
  );
}
