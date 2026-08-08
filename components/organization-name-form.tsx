'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { updateOrganizationName } from '@/app/(app)/_actions/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

export function OrganizationNameForm({ initialName, canEdit }: { initialName: string; canEdit: boolean }) {
  // Manual opt-in tracking: no signals babel/swc transform is configured, so
  // components must subscribe themselves to re-render on `.value` reads.
  useSignals();
  const router = useRouter();
  const name = useSignal(initialName);
  const isSubmitting = useSignal(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    isSubmitting.value = true;

    const actionResult = await updateOrganizationName(name.value);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Vereinsname gespeichert', type: 'success' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="organizationName">Vereinsname</FieldLabel>
        <Input
          id="organizationName"
          disabled={!canEdit}
          value={name.value}
          onChange={(e) => (name.value = e.target.value)}
        />
      </Field>
      {canEdit && (
        <Button type="submit" disabled={isSubmitting.value} className="self-start">
          Speichern
        </Button>
      )}
    </form>
  );
}
