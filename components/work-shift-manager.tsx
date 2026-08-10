'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createWorkShift } from '@/app/(app)/_actions/work-shifts';
import { createWorkShiftSchema } from '@/lib/validation/work-shift';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { EyeIcon, PlusIcon } from '@phosphor-icons/react';

const NONE = 'none';

type WorkShiftRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  facilityId: string | null;
  participantCount: number;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-DE');
}

export function WorkShiftManager({
  initialItems,
  facilities,
  canCreate,
}: {
  initialItems: WorkShiftRow[];
  facilities: { id: string; name: string }[];
  canCreate: boolean;
}) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const title = useSignal('');
  const description = useSignal('');
  const date = useSignal('');
  const location = useSignal('');
  const facilityId = useSignal(NONE);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  const facilityById = new Map(facilities.map((facility) => [facility.id, facility.name]));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      title: title.value,
      description: description.value || undefined,
      date: date.value,
      location: location.value || undefined,
      facilityId: facilityId.value === NONE ? undefined : facilityId.value,
    };
    const result = createWorkShiftSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createWorkShift(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Arbeitseinsatz angelegt', type: 'success' });
    open.value = false;
    title.value = '';
    description.value = '';
    date.value = '';
    location.value = '';
    facilityId.value = NONE;
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
                  Arbeitseinsatz anlegen
                </Button>
              }
            />
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Arbeitseinsatz anlegen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!errors.value.title}>
                    <FieldLabel htmlFor="shiftTitle">Titel</FieldLabel>
                    <Input
                      id="shiftTitle"
                      placeholder="z. B. Frühjahrsputz"
                      value={title.value}
                      onChange={(e) => (title.value = e.target.value)}
                      aria-invalid={!!errors.value.title}
                    />
                    {errors.value.title && <FieldError errors={[{ message: errors.value.title }]} />}
                  </Field>
                  <Field data-invalid={!!errors.value.date}>
                    <FieldLabel htmlFor="shiftDate">Datum</FieldLabel>
                    <Input
                      id="shiftDate"
                      type="date"
                      value={date.value}
                      onChange={(e) => (date.value = e.target.value)}
                      aria-invalid={!!errors.value.date}
                    />
                    {errors.value.date && <FieldError errors={[{ message: errors.value.date }]} />}
                  </Field>
                  <Field data-invalid={!!errors.value.location}>
                    <FieldLabel htmlFor="shiftLocation">Ort (optional)</FieldLabel>
                    <Input id="shiftLocation" value={location.value} onChange={(e) => (location.value = e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="shiftFacility">Garagenanlage (optional)</FieldLabel>
                    <Select value={facilityId.value} onValueChange={(value) => (facilityId.value = value ?? NONE)}>
                      <SelectTrigger id="shiftFacility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={NONE}>Vereinsweit</SelectItem>
                          {facilities.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id}>
                              {facility.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field data-invalid={!!errors.value.description}>
                    <FieldLabel htmlFor="shiftDescription">Beschreibung (optional)</FieldLabel>
                    <Textarea
                      id="shiftDescription"
                      rows={3}
                      value={description.value}
                      onChange={(e) => (description.value = e.target.value)}
                    />
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
            <TableHead>Datum</TableHead>
            <TableHead>Titel</TableHead>
            <TableHead>Ort</TableHead>
            <TableHead>Garagenanlage</TableHead>
            <TableHead>Teilnehmer</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Noch kein Arbeitseinsatz erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell>{formatDate(shift.date)}</TableCell>
              <TableCell>{shift.title}</TableCell>
              <TableCell>{shift.location ?? '–'}</TableCell>
              <TableCell>{shift.facilityId ? (facilityById.get(shift.facilityId) ?? '–') : 'Vereinsweit'}</TableCell>
              <TableCell>{shift.participantCount}</TableCell>
              <TableCell className="text-right">
                <Link href={`/arbeitseinsaetze/${shift.id}`}>
                  <Button size="icon-sm" variant="ghost">
                    <EyeIcon />
                    <span className="sr-only">Ansehen</span>
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
