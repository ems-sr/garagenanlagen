'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createMembershipPeriod, endMembershipPeriod } from '@/app/(app)/_actions/membership-periods';
import { createMembershipPeriodSchema } from '@/lib/validation/membership-period';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon } from '@phosphor-icons/react';

type Period = { id: string; startDate: string; endDate: string | null };

function formatDate(value: string | null) {
  if (!value) return '–';
  return new Date(value).toLocaleDateString('de-DE');
}

export function MembershipPeriodManager({ memberId, initialItems }: { memberId: string; initialItems: Period[] }) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const startDate = useSignal('');
  const endDate = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const payload = { startDate: startDate.value, endDate: endDate.value || undefined };
    const result = createMembershipPeriodSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createMembershipPeriod(memberId, result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Mitgliedschaftszeitraum angelegt', type: 'success' });
    open.value = false;
    startDate.value = '';
    endDate.value = '';
    router.refresh();
  }

  async function handleEnd(periodId: string) {
    const result = await endMembershipPeriod(memberId, periodId, { endDate: new Date() });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Mitgliedschaftszeitraum beendet', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open.value} onOpenChange={(next) => (open.value = next)}>
          <DialogTrigger
            render={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Zeitraum hinzufügen
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mitgliedschaftszeitraum hinzufügen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd}>
              <FieldGroup>
                <Field data-invalid={!!errors.value.startDate}>
                  <FieldLabel htmlFor="startDate">Beginn</FieldLabel>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate.value}
                    onChange={(e) => (startDate.value = e.target.value)}
                    aria-invalid={!!errors.value.startDate}
                  />
                  {errors.value.startDate && <FieldError errors={[{ message: errors.value.startDate }]} />}
                </Field>
                <Field data-invalid={!!errors.value.endDate}>
                  <FieldLabel htmlFor="endDate">Ende (optional)</FieldLabel>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate.value}
                    onChange={(e) => (endDate.value = e.target.value)}
                    aria-invalid={!!errors.value.endDate}
                  />
                  {errors.value.endDate && <FieldError errors={[{ message: errors.value.endDate }]} />}
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Beginn</TableHead>
            <TableHead>Ende</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Keine Mitgliedschaftszeiträume erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((period) => (
            <TableRow key={period.id}>
              <TableCell>{formatDate(period.startDate)}</TableCell>
              <TableCell>{formatDate(period.endDate)}</TableCell>
              <TableCell className="text-right">
                {!period.endDate && (
                  <Button size="sm" variant="outline" onClick={() => handleEnd(period.id)}>
                    Beenden
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
