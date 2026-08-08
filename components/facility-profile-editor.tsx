'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { updateFacility } from '@/app/(app)/_actions/facilities';
import { createFacilitySchema } from '@/lib/validation/facility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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

type FormValues = { name: string; street: string; postalCode: string; city: string };

export function FacilityProfileEditor({ facilityId, initialValues }: { facilityId: string; initialValues: FormValues }) {
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

    const actionResult = await updateFacility(facilityId, result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Garagenanlage aktualisiert', type: 'success' });
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
          <DialogTitle>Garagenanlage bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.value.name}>
              <FieldLabel htmlFor="editName">Name</FieldLabel>
              <Input
                id="editName"
                value={values.value.name}
                onChange={(e) => setField('name', e.target.value)}
                aria-invalid={!!errors.value.name}
              />
              {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
            </Field>
            <Field orientation="responsive">
              <FieldLabel htmlFor="editStreet">Straße</FieldLabel>
              <Input id="editStreet" value={values.value.street} onChange={(e) => setField('street', e.target.value)} />
            </Field>
            <Field orientation="responsive">
              <FieldLabel htmlFor="editPostalCode">PLZ</FieldLabel>
              <Input
                id="editPostalCode"
                value={values.value.postalCode}
                onChange={(e) => setField('postalCode', e.target.value)}
              />
            </Field>
            <Field orientation="responsive">
              <FieldLabel htmlFor="editCity">Ort</FieldLabel>
              <Input id="editCity" value={values.value.city} onChange={(e) => setField('city', e.target.value)} />
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
