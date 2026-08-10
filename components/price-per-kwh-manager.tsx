'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createPricePerKwh, endPricePerKwh } from '@/app/(app)/_actions/price-per-kwh';
import { createPricePerKwhSchema } from '@/lib/validation/price-per-kwh';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon } from '@phosphor-icons/react';

type Price = { id: string; pricePerKwh: number; validFrom: string; validTo: string | null };

function formatDate(value: string | null) {
  if (!value) return '–';
  return new Date(value).toLocaleDateString('de-DE');
}

export function PricePerKwhManager({
  facilityId,
  initialItems,
  canEdit,
}: {
  facilityId: string;
  initialItems: Price[];
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const priceEuro = useSignal('');
  const validFrom = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const cents = Math.round(Number(priceEuro.value.replace(',', '.')) * 100);
    const payload = { facilityId, pricePerKwh: cents, validFrom: validFrom.value };
    const result = createPricePerKwhSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createPricePerKwh(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Strompreis angelegt', type: 'success' });
    open.value = false;
    priceEuro.value = '';
    validFrom.value = '';
    router.refresh();
  }

  async function handleEnd(priceId: string) {
    const result = await endPricePerKwh(priceId, { validTo: new Date() });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Strompreis beendet', type: 'success' });
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
                  Preis hinzufügen
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Strompreis hinzufügen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!errors.value.pricePerKwh}>
                    <FieldLabel htmlFor="pricePerKwh">Preis pro kWh (€)</FieldLabel>
                    <Input
                      id="pricePerKwh"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={priceEuro.value}
                      onChange={(e) => (priceEuro.value = e.target.value)}
                      aria-invalid={!!errors.value.pricePerKwh}
                    />
                    {errors.value.pricePerKwh && <FieldError errors={[{ message: errors.value.pricePerKwh }]} />}
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
            <TableHead>Preis pro kWh</TableHead>
            <TableHead>Gültig ab</TableHead>
            <TableHead>Gültig bis</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground">
                Noch kein Strompreis erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((price) => (
            <TableRow key={price.id}>
              <TableCell>{formatCents(price.pricePerKwh)}</TableCell>
              <TableCell>{formatDate(price.validFrom)}</TableCell>
              <TableCell>{formatDate(price.validTo)}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  {!price.validTo && (
                    <Button size="sm" variant="outline" onClick={() => handleEnd(price.id)}>
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
