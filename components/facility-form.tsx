'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createFacility } from '@/app/(app)/_actions/facilities';
import { createFacilitySchema } from '@/lib/validation/facility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

type FacilityValues = {
  name: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
};

const emptyValues: FacilityValues = {
  name: '',
  street: '',
  houseNumber: '',
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
      houseNumber: values.value.houseNumber || undefined,
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
          <FieldLabel htmlFor="street" className="@md/field-group:w-28! @md/field-group:flex-none!">
            Straße
          </FieldLabel>
          <FieldContent>
            <Input id="street" value={values.value.street} onChange={(e) => setField('street', e.target.value)} />
          </FieldContent>
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="houseNumber" className="@md/field-group:w-28! @md/field-group:flex-none!">
            Hausnummer
          </FieldLabel>
          <FieldContent>
            <Input
              id="houseNumber"
              value={values.value.houseNumber}
              onChange={(e) => setField('houseNumber', e.target.value)}
            />
          </FieldContent>
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="postalCode" className="@md/field-group:w-28! @md/field-group:flex-none!">
            PLZ
          </FieldLabel>
          <FieldContent>
            <Input
              id="postalCode"
              value={values.value.postalCode}
              onChange={(e) => setField('postalCode', e.target.value)}
            />
          </FieldContent>
        </Field>
        <Field orientation="responsive">
          <FieldLabel htmlFor="city" className="@md/field-group:w-28! @md/field-group:flex-none!">
            Ort
          </FieldLabel>
          <FieldContent>
            <Input id="city" value={values.value.city} onChange={(e) => setField('city', e.target.value)} />
          </FieldContent>
        </Field>
        <Button type="submit" disabled={isSubmitting.value}>
          Speichern
        </Button>
      </FieldGroup>
    </form>
  );
}
