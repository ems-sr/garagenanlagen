'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createMember, updateMember } from '@/app/(app)/_actions/members';
import { createClubMemberSchema } from '@/lib/validation/club-member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

type MemberValues = {
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
};

const emptyValues: MemberValues = {
  firstName: '',
  lastName: '',
  street: '',
  postalCode: '',
  city: '',
  email: '',
  phone: '',
};

export function MemberForm({
  memberId,
  initialValues,
}: {
  memberId?: string;
  initialValues?: MemberValues;
}) {
  useSignals();
  const router = useRouter();
  const values = useSignal<MemberValues>(initialValues ?? emptyValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function setField<K extends keyof MemberValues>(key: K, value: MemberValues[K]) {
    values.value = { ...values.value, [key]: value };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = Object.fromEntries(
      Object.entries(values.value).map(([key, value]) => [key, value === '' ? undefined : value]),
    );
    const result = createClubMemberSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = memberId ? await updateMember(memberId, result.data) : await createMember(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: memberId ? 'Mitglied aktualisiert' : 'Mitglied angelegt', type: 'success' });
    router.push(`/mitglieder/${actionResult.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field orientation="responsive" data-invalid={!!errors.value.firstName}>
          <FieldLabel htmlFor="firstName">Vorname</FieldLabel>
          <Input
            id="firstName"
            value={values.value.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            aria-invalid={!!errors.value.firstName}
          />
          {errors.value.firstName && <FieldError errors={[{ message: errors.value.firstName }]} />}
        </Field>
        <Field orientation="responsive" data-invalid={!!errors.value.lastName}>
          <FieldLabel htmlFor="lastName">Nachname</FieldLabel>
          <Input
            id="lastName"
            value={values.value.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            aria-invalid={!!errors.value.lastName}
          />
          {errors.value.lastName && <FieldError errors={[{ message: errors.value.lastName }]} />}
        </Field>
        <Field data-invalid={!!errors.value.street}>
          <FieldLabel htmlFor="street">Straße</FieldLabel>
          <Input id="street" value={values.value.street} onChange={(e) => setField('street', e.target.value)} />
        </Field>
        <Field orientation="responsive" data-invalid={!!errors.value.postalCode}>
          <FieldLabel htmlFor="postalCode">PLZ</FieldLabel>
          <Input
            id="postalCode"
            value={values.value.postalCode}
            onChange={(e) => setField('postalCode', e.target.value)}
          />
        </Field>
        <Field data-invalid={!!errors.value.city}>
          <FieldLabel htmlFor="city">Ort</FieldLabel>
          <Input id="city" value={values.value.city} onChange={(e) => setField('city', e.target.value)} />
        </Field>
        <Field data-invalid={!!errors.value.email}>
          <FieldLabel htmlFor="email">E-Mail</FieldLabel>
          <Input
            id="email"
            type="email"
            value={values.value.email}
            onChange={(e) => setField('email', e.target.value)}
            aria-invalid={!!errors.value.email}
          />
          {errors.value.email && <FieldError errors={[{ message: errors.value.email }]} />}
        </Field>
        <Field data-invalid={!!errors.value.phone}>
          <FieldLabel htmlFor="phone">Telefon</FieldLabel>
          <Input id="phone" value={values.value.phone} onChange={(e) => setField('phone', e.target.value)} />
        </Field>
        <Button type="submit" disabled={isSubmitting.value}>
          Speichern
        </Button>
      </FieldGroup>
    </form>
  );
}
