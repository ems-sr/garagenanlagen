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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { PlusIcon, TrashIcon, CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react';

type Reading = { id: string; readingDate: string; value: string; note: string | null; invoiced: boolean };

type SortColumn = 'readingDate' | 'value' | 'note' | 'invoiced';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'open' | 'invoiced';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Alle',
  open: 'Offen',
  invoiced: 'Abgerechnet',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-DE');
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return null;
  return direction === 'asc' ? <CaretUpIcon className="size-3.5" /> : <CaretDownIcon className="size-3.5" />;
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
  const sortColumn = useSignal<SortColumn>('readingDate');
  const sortDirection = useSignal<SortDirection>('desc');
  const noteFilter = useSignal('');
  const statusFilter = useSignal<StatusFilter>('all');
  const minValue = useSignal('');
  const maxValue = useSignal('');
  const fromDate = useSignal('');
  const toDate = useSignal('');

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

  function toggleSort(column: SortColumn) {
    if (sortColumn.value === column) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn.value = column;
      sortDirection.value = 'asc';
    }
  }

  const min = minValue.value.trim() === '' ? null : Number(minValue.value);
  const max = maxValue.value.trim() === '' ? null : Number(maxValue.value);
  const noteTerm = noteFilter.value.trim().toLowerCase();

  const filteredItems = initialItems.filter((reading) => {
    if (noteTerm && !(reading.note ?? '').toLowerCase().includes(noteTerm)) return false;
    if (statusFilter.value === 'open' && reading.invoiced) return false;
    if (statusFilter.value === 'invoiced' && !reading.invoiced) return false;
    if (min !== null && !Number.isNaN(min) && Number(reading.value) < min) return false;
    if (max !== null && !Number.isNaN(max) && Number(reading.value) > max) return false;
    const readingDay = reading.readingDate.slice(0, 10);
    if (fromDate.value && readingDay < fromDate.value) return false;
    if (toDate.value && readingDay > toDate.value) return false;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let cmp = 0;
    switch (sortColumn.value) {
      case 'readingDate':
        cmp = a.readingDate.localeCompare(b.readingDate);
        break;
      case 'value':
        cmp = Number(a.value) - Number(b.value);
        break;
      case 'note':
        cmp = (a.note ?? '').localeCompare(b.note ?? '', 'de');
        break;
      case 'invoiced':
        cmp = Number(a.invoiced) - Number(b.invoiced);
        break;
    }
    return sortDirection.value === 'asc' ? cmp : -cmp;
  });

  const hasActiveFilters =
    noteFilter.value.trim() !== '' ||
    statusFilter.value !== 'all' ||
    minValue.value.trim() !== '' ||
    maxValue.value.trim() !== '' ||
    fromDate.value !== '' ||
    toDate.value !== '';

  function resetFilters() {
    noteFilter.value = '';
    statusFilter.value = 'all';
    minValue.value = '';
    maxValue.value = '';
    fromDate.value = '';
    toDate.value = '';
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        {hasActiveFilters ? (
          <Button size="sm" variant="outline" onClick={resetFilters}>
            Filter zurücksetzen
          </Button>
        ) : (
          <div />
        )}
        {canEdit && (
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
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('readingDate')}>
              <span className="inline-flex items-center gap-1">
                Ablesedatum
                <SortIcon active={sortColumn.value === 'readingDate'} direction={sortDirection.value} />
              </span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('value')}>
              <span className="inline-flex items-center gap-1">
                Zählerstand
                <SortIcon active={sortColumn.value === 'value'} direction={sortDirection.value} />
              </span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('note')}>
              <span className="inline-flex items-center gap-1">
                Notiz
                <SortIcon active={sortColumn.value === 'note'} direction={sortDirection.value} />
              </span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('invoiced')}>
              <span className="inline-flex items-center gap-1">
                Status
                <SortIcon active={sortColumn.value === 'invoiced'} direction={sortDirection.value} />
              </span>
            </TableHead>
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
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  className="h-8 w-32"
                  value={fromDate.value}
                  onChange={(e) => (fromDate.value = e.target.value)}
                />
                <Input
                  type="date"
                  className="h-8 w-32"
                  value={toDate.value}
                  onChange={(e) => (toDate.value = e.target.value)}
                />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Von"
                  className="h-8 w-20"
                  value={minValue.value}
                  onChange={(e) => (minValue.value = e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Bis"
                  className="h-8 w-20"
                  value={maxValue.value}
                  onChange={(e) => (maxValue.value = e.target.value)}
                />
              </div>
            </TableHead>
            <TableHead>
              <Input
                placeholder="Notiz durchsuchen…"
                className="h-8 w-full"
                value={noteFilter.value}
                onChange={(e) => (noteFilter.value = e.target.value)}
              />
            </TableHead>
            <TableHead>
              <Select value={statusFilter.value} onValueChange={(value) => (statusFilter.value = value as StatusFilter)}>
                <SelectTrigger size="sm">
                  <SelectValue>{(value: StatusFilter | null) => (value ? STATUS_FILTER_LABELS[value] : '')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {STATUS_FILTER_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </TableHead>
            {(canEdit || canInvoice) && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit || canInvoice ? 5 : 4} className="text-center text-muted-foreground">
                {initialItems.length === 0 ? 'Noch keine Zählerstände erfasst.' : 'Keine Zählerstände entsprechen den Filtern.'}
              </TableCell>
            </TableRow>
          )}
          {sortedItems.map((reading) => (
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
