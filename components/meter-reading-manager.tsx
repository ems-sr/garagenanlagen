'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createMeterReading, deleteMeterReading } from '@/app/(app)/_actions/meter-readings';
import { generateInvoice } from '@/app/(app)/_actions/invoices';
import { createMeterReadingSchema } from '@/lib/validation/meter-reading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';

type Reading = { id: string; readingDate: string; value: string; note: string | null; invoiced: boolean };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-DE');
}

export function MeterReadingManager({
  garageId,
  initialItems,
  canEdit,
  canInvoice,
}: {
  garageId: string;
  initialItems: Reading[];
  canEdit: boolean;
  canInvoice: boolean;
}) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const readingDate = useSignal('');
  const value = useSignal('');
  const note = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const payload = { garageId, readingDate: readingDate.value, value: value.value, note: note.value || undefined };
    const result = createMeterReadingSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createMeterReading(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Zählerstand erfasst', type: 'success' });
    open.value = false;
    readingDate.value = '';
    value.value = '';
    note.value = '';
    router.refresh();
  }

  async function handleDelete(readingId: string) {
    const result = await deleteMeterReading(readingId);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Zählerstand gelöscht', type: 'success' });
    router.refresh();
  }

  const latestReading = initialItems.reduce<Reading | undefined>(
    (latest, reading) => (!latest || reading.readingDate > latest.readingDate ? reading : latest),
    undefined,
  );

  async function handleGenerateInvoice(readingId: string) {
    const result = await generateInvoice({ meterReadingId: readingId });
    if (!result.success) {
      toast.add({ title: 'Rechnung konnte nicht erstellt werden', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: `Rechnung ${result.data.invoiceNumber} erstellt`, type: 'success' });
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
                  Zählerstand erfassen
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Zählerstand erfassen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!errors.value.readingDate}>
                    <FieldLabel htmlFor="readingDate">Ablesedatum</FieldLabel>
                    <Input
                      id="readingDate"
                      type="date"
                      value={readingDate.value}
                      onChange={(e) => (readingDate.value = e.target.value)}
                      aria-invalid={!!errors.value.readingDate}
                    />
                    {errors.value.readingDate && <FieldError errors={[{ message: errors.value.readingDate }]} />}
                  </Field>
                  <Field data-invalid={!!errors.value.value}>
                    <FieldLabel htmlFor="value">Zählerstand (kWh)</FieldLabel>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={value.value}
                      onChange={(e) => (value.value = e.target.value)}
                      aria-invalid={!!errors.value.value}
                    />
                    {errors.value.value && <FieldError errors={[{ message: errors.value.value }]} />}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="note">Notiz (optional)</FieldLabel>
                    <Input id="note" value={note.value} onChange={(e) => (note.value = e.target.value)} />
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
            <TableHead>Ablesedatum</TableHead>
            <TableHead>Zählerstand</TableHead>
            <TableHead>Notiz</TableHead>
            <TableHead>Status</TableHead>
            {(canEdit || canInvoice) && (
              <TableHead className="text-right">
                {canInvoice && latestReading && !latestReading.invoiced && (
                  <Button size="sm" variant="outline" onClick={() => handleGenerateInvoice(latestReading.id)}>
                    Rechnung erzeugen
                  </Button>
                )}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit || canInvoice ? 5 : 4} className="text-center text-muted-foreground">
                Noch keine Zählerstände erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((reading) => (
            <TableRow key={reading.id}>
              <TableCell>{formatDate(reading.readingDate)}</TableCell>
              <TableCell>{reading.value} kWh</TableCell>
              <TableCell>{reading.note ?? '–'}</TableCell>
              <TableCell>
                <Badge variant={reading.invoiced ? 'secondary' : 'outline'}>
                  {reading.invoiced ? 'Abgerechnet' : 'Offen'}
                </Badge>
              </TableCell>
              {(canEdit || canInvoice) && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button size="icon-sm" variant="ghost">
                              <TrashIcon />
                              <span className="sr-only">Löschen</span>
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Zählerstand löschen?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(reading.id)}>Löschen</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
