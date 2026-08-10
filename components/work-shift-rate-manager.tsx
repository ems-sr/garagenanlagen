'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createWorkShiftRate, endWorkShiftRate } from '@/app/(app)/_actions/work-shift-rates';
import { createWorkShiftRateSchema } from '@/lib/validation/work-shift-rate';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon } from '@phosphor-icons/react';

type Rate = { id: string; amountPerHour: number; validFrom: string; validTo: string | null };

function formatDate(value: string | null) {
  if (!value) return '–';
  return new Date(value).toLocaleDateString('de-DE');
}

export function WorkShiftRateManager({ initialItems, canEdit }: { initialItems: Rate[]; canEdit: boolean }) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const amountEuro = useSignal('');
  const validFrom = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const cents = Math.round(Number(amountEuro.value.replace(',', '.')) * 100);
    const payload = { amountPerHour: cents, validFrom: validFrom.value };
    const result = createWorkShiftRateSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createWorkShiftRate(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Satz angelegt', type: 'success' });
    open.value = false;
    amountEuro.value = '';
    validFrom.value = '';
    router.refresh();
  }

  async function handleEnd(rateId: string) {
    const result = await endWorkShiftRate(rateId, { validTo: new Date() });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Satz beendet', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={open.value} onOpenChange={(next) => (open.value = next)}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Satz hinzufügen
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aufwandsentschädigungssatz hinzufügen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!errors.value.amountPerHour}>
                    <FieldLabel htmlFor="amountPerHour">Betrag pro Stunde (€)</FieldLabel>
                    <Input
                      id="amountPerHour"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amountEuro.value}
                      onChange={(e) => (amountEuro.value = e.target.value)}
                      aria-invalid={!!errors.value.amountPerHour}
                    />
                    {errors.value.amountPerHour && <FieldError errors={[{ message: errors.value.amountPerHour }]} />}
                  </Field>
                  <Field data-invalid={!!errors.value.validFrom}>
                    <FieldLabel htmlFor="validFrom">Gültig ab</FieldLabel>
                    <Input
                      id="validFrom"
                      type="date"
                      value={validFrom.value}
                      onChange={(e) => (validFrom.value = e.target.value)}
                      aria-invalid={!!errors.value.validFrom}
                    />
                    {errors.value.validFrom && <FieldError errors={[{ message: errors.value.validFrom }]} />}
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Betrag pro Stunde</TableHead>
            <TableHead>Gültig ab</TableHead>
            <TableHead>Gültig bis</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground">
                Noch kein Satz erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((rate) => (
            <TableRow key={rate.id}>
              <TableCell>{formatCents(rate.amountPerHour)}</TableCell>
              <TableCell>{formatDate(rate.validFrom)}</TableCell>
              <TableCell>{formatDate(rate.validTo)}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  {!rate.validTo && (
                    <Button size="sm" variant="outline" onClick={() => handleEnd(rate.id)}>
                      Beenden
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
