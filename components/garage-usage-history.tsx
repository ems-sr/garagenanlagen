'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createUsageNote } from '@/app/(app)/_actions/garage-usage-events';
import { createUsageNoteSchema } from '@/lib/validation/garage-usage-event';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon } from '@phosphor-icons/react';

type UsageEvent = {
  id: string;
  eventType: 'assignmentStarted' | 'assignmentEnded' | 'note';
  description: string;
  occurredAt: string;
};

const EVENT_TYPE_LABELS: Record<UsageEvent['eventType'], string> = {
  assignmentStarted: 'Zuordnung',
  assignmentEnded: 'Zuordnung',
  note: 'Notiz',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('de-DE');
}

export function GarageUsageHistory({ garageId, initialItems, canCreate }: { garageId: string; initialItems: UsageEvent[]; canCreate: boolean }) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const description = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const payload = { description: description.value };
    const result = createUsageNoteSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createUsageNote(garageId, result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Notiz hinzugefügt', type: 'success' });
    open.value = false;
    description.value = '';
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="flex justify-end">
          <Dialog open={open.value} onOpenChange={(next) => (open.value = next)}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Notiz hinzufügen
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notiz hinzufügen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!errors.value.description}>
                    <FieldLabel htmlFor="usageNoteDescription">Beschreibung</FieldLabel>
                    <Textarea
                      id="usageNoteDescription"
                      rows={3}
                      value={description.value}
                      onChange={(e) => (description.value = e.target.value)}
                      aria-invalid={!!errors.value.description}
                    />
                    {errors.value.description && <FieldError errors={[{ message: errors.value.description }]} />}
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
        </div>
      )}
      <div className="flex flex-col gap-3">
        {initialItems.length === 0 && <p className="text-muted-foreground">Noch kein Verlaufseintrag vorhanden.</p>}
        {initialItems.map((event) => (
          <div key={event.id} className="flex items-start gap-3 border-b pb-3 last:border-b-0">
            <Badge variant={event.eventType === 'note' ? 'secondary' : 'outline'}>{EVENT_TYPE_LABELS[event.eventType]}</Badge>
            <div className="flex flex-col gap-1">
              <p>{event.description}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
