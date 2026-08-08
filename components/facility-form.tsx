'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createFacility } from '@/app/(app)/_actions/facilities';
import { createFacilitySchema } from '@/lib/validation/facility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

type FacilityValues = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
};

const emptyValues: FacilityValues = {
  name: '',
  street: '',
  postalCode: '',
  city: '',
};

export function FacilityForm() {
  useSignals();
  const router = useRouter();
  const values = useSignal<FacilityValues>(emptyValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function setField<K extends keyof FacilityValues>(key: K, value: FacilityValues[K]) {
    values.value = { ...values.value, [key]: value };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      name: values.value.name,
      street: values.value.street || undefined,
      postalCode: values.value.postalCode || undefined,
      city: values.value.city || undefined,
    };
    const result = createFacilitySchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createFacility(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Garagenanlage angelegt', type: 'success' });
    router.push(`/garagenanlagen/${actionResult.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.value.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            value={values.value.name}
            onChange={(e) => setField('name', e.target.value)}
            aria-invalid={!!errors.value.name}
          />
          {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="street">Straße</FieldLabel>
          <Input id="street" value={values.value.street} onChange={(e) => setField('street', e.target.value)} />
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="postalCode">PLZ</FieldLabel>
          <Input
            id="postalCode"
            value={values.value.postalCode}
            onChange={(e) => setField('postalCode', e.target.value)}
          />
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="city">Ort</FieldLabel>
          <Input id="city" value={values.value.city} onChange={(e) => setField('city', e.target.value)} />
        </Field>
        <Button type="submit" disabled={isSubmitting.value}>
          Speichern
        </Button>
      </FieldGroup>
    </form>
  );
}
