'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { updateClubProfile } from '@/app/(app)/_actions/club-profile';
import { updateOrganizationName } from '@/app/(app)/_actions/organization';
import { updateClubProfileSchema } from '@/lib/validation/club-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

type ClubProfileValues = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  bankIban: string;
  bankBic: string;
  bankName: string;
  accountHolder: string;
  contactEmail: string;
  contactPhone: string;
};

export function ClubProfileForm({
  initialProfile,
  canEdit,
  canEditName,
}: {
  initialProfile: ClubProfileValues;
  canEdit: boolean;
  canEditName: boolean;
}) {
  // Manual opt-in tracking: no signals babel/swc transform is configured, so
  // components must subscribe themselves to re-render on `.value` reads.
  useSignals();
  const router = useRouter();
  const values = useSignal<ClubProfileValues>(initialProfile);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function setField<K extends keyof ClubProfileValues>(key: K, value: ClubProfileValues[K]) {
    values.value = { ...values.value, [key]: value };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { name, ...profileValues } = values.value;
    const payload = Object.fromEntries(
      Object.entries(profileValues).map(([key, value]) => [key, value === '' ? undefined : value]),
    );
    const result = updateClubProfileSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    if (canEditName && !name.trim()) {
      errors.value = { name: 'Vereinsname erforderlich' };
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const [nameResult, profileResult] = await Promise.all([
      canEditName ? updateOrganizationName(name) : Promise.resolve({ success: true as const, data: { name } }),
      updateClubProfile(result.data),
    ]);

    isSubmitting.value = false;

    if (!nameResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: nameResult.error.message, type: 'error' });
      return;
    }
    if (!profileResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: profileResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Vereins-Stammdaten gespeichert', type: 'success' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.value.name}>
          <FieldLabel htmlFor="name">Vereinsname</FieldLabel>
          <Input
            id="name"
            disabled={!canEditName}
            value={values.value.name}
            onChange={(e) => setField('name', e.target.value)}
            aria-invalid={!!errors.value.name}
          />
          {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
        </Field>
        <Field data-invalid={!!errors.value.street}>
          <FieldLabel htmlFor="street">Straße</FieldLabel>
          <Input
            id="street"
            disabled={!canEdit}
            value={values.value.street}
            onChange={(e) => setField('street', e.target.value)}
          />
          {errors.value.street && <FieldError errors={[{ message: errors.value.street }]} />}
        </Field>
        <Field orientation="responsive" data-invalid={!!errors.value.postalCode}>
          <FieldLabel htmlFor="postalCode">PLZ</FieldLabel>
          <Input
            id="postalCode"
            disabled={!canEdit}
            value={values.value.postalCode}
            onChange={(e) => setField('postalCode', e.target.value)}
          />
        </Field>
        <Field data-invalid={!!errors.value.city}>
          <FieldLabel htmlFor="city">Ort</FieldLabel>
          <Input
            id="city"
            disabled={!canEdit}
            value={values.value.city}
            onChange={(e) => setField('city', e.target.value)}
          />
        </Field>

        <FieldSeparator>Bankverbindung</FieldSeparator>

        <Field data-invalid={!!errors.value.accountHolder}>
          <FieldLabel htmlFor="accountHolder">Kontoinhaber</FieldLabel>
          <Input
            id="accountHolder"
            disabled={!canEdit}
            value={values.value.accountHolder}
            onChange={(e) => setField('accountHolder', e.target.value)}
          />
        </Field>
        <Field data-invalid={!!errors.value.bankName}>
          <FieldLabel htmlFor="bankName">Bank</FieldLabel>
          <Input
            id="bankName"
            disabled={!canEdit}
            value={values.value.bankName}
            onChange={(e) => setField('bankName', e.target.value)}
          />
        </Field>
        <Field data-invalid={!!errors.value.bankIban}>
          <FieldLabel htmlFor="bankIban">IBAN</FieldLabel>
          <Input
            id="bankIban"
            disabled={!canEdit}
            value={values.value.bankIban}
            onChange={(e) => setField('bankIban', e.target.value)}
          />
        </Field>
        <Field data-invalid={!!errors.value.bankBic}>
          <FieldLabel htmlFor="bankBic">BIC</FieldLabel>
          <Input
            id="bankBic"
            disabled={!canEdit}
            value={values.value.bankBic}
            onChange={(e) => setField('bankBic', e.target.value)}
          />
        </Field>

        <FieldSeparator>Kontakt</FieldSeparator>

        <Field data-invalid={!!errors.value.contactEmail}>
          <FieldLabel htmlFor="contactEmail">E-Mail</FieldLabel>
          <Input
            id="contactEmail"
            type="email"
            disabled={!canEdit}
            value={values.value.contactEmail}
            onChange={(e) => setField('contactEmail', e.target.value)}
            aria-invalid={!!errors.value.contactEmail}
          />
          {errors.value.contactEmail && <FieldError errors={[{ message: errors.value.contactEmail }]} />}
        </Field>
        <Field data-invalid={!!errors.value.contactPhone}>
          <FieldLabel htmlFor="contactPhone">Telefon</FieldLabel>
          <Input
            id="contactPhone"
            disabled={!canEdit}
            value={values.value.contactPhone}
            onChange={(e) => setField('contactPhone', e.target.value)}
          />
        </Field>

        {(canEdit || canEditName) && (
          <Button type="submit" disabled={isSubmitting.value}>
            Speichern
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}
