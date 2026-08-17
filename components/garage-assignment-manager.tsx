'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createGarageAssignment, endGarageAssignment } from '@/app/(app)/_actions/garage-assignments';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon } from '@phosphor-icons/react';

type Assignment = {
  id: string;
  garageNumber: string;
  facilityName: string;
  validFrom: string;
  validTo: string | null;
};

type GarageOption = { id: string; number: string; facilityId: string; facilityName: string };
type FacilityOption = { id: string; name: string };
type GarageAssignmentPeriod = { garageId: string; validFrom: string; validTo: string | null };

function formatDate(value: string | null) {
  if (!value) return '–';
  return new Date(value).toLocaleDateString('de-DE');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function GarageAssignmentManager({
  memberId,
  initialItems,
  availableGarages,
  garageAssignments,
  facilities,
}: {
  memberId: string;
  initialItems: Assignment[];
  availableGarages: GarageOption[];
  garageAssignments: GarageAssignmentPeriod[];
  facilities: FacilityOption[];
}) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const facilityId = useSignal<string>('');
  const garageId = useSignal<string>('');
  const validFrom = useSignal<string>(today());
  const error = useSignal<string | undefined>(undefined);
  const isSubmitting = useSignal(false);

  const facilityNameById = new Map(facilities.map((facility) => [facility.id, facility.name]));
  const selectedDate = validFrom.value ? new Date(validFrom.value) : null;
  const isGarageFreeOnDate = (id: string) =>
    !selectedDate ||
    !garageAssignments.some(
      (a) => a.garageId === id && new Date(a.validFrom) <= selectedDate && (!a.validTo || new Date(a.validTo) > selectedDate),
    );
  const garagesForFacility = facilityId.value
    ? availableGarages.filter((garage) => garage.facilityId === facilityId.value && isGarageFreeOnDate(garage.id))
    : [];
  const selectedGarage = garagesForFacility.find((garage) => garage.id === garageId.value) ?? null;

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!garageId.value) {
      error.value = 'Garage erforderlich';
      return;
    }
    error.value = undefined;
    isSubmitting.value = true;

    const result = await createGarageAssignment({
      type: 'member',
      garageId: garageId.value,
      clubMemberId: memberId,
      validFrom: validFrom.value ? new Date(validFrom.value) : undefined,
    });

    isSubmitting.value = false;

    if (!result.success) {
      toast.add({ title: 'Zuordnung fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Garage zugeordnet', type: 'success' });
    open.value = false;
    facilityId.value = '';
    garageId.value = '';
    validFrom.value = today();
    router.refresh();
  }

  async function handleEnd(assignmentId: string) {
    const result = await endGarageAssignment(assignmentId, { validTo: new Date() });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Zuordnung beendet', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open.value} onOpenChange={(next) => (open.value = next)}>
          <DialogTrigger
            render={
              <Button size="sm" disabled={availableGarages.length === 0}>
                <PlusIcon data-icon="inline-start" />
                Garage zuordnen
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Garage zuordnen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssign}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="validFrom">Gültig ab</FieldLabel>
                  <Input
                    id="validFrom"
                    type="date"
                    value={validFrom.value}
                    onChange={(e) => {
                      validFrom.value = e.target.value;
                      // The garage list depends on the chosen date, so a
                      // previously picked garage that's assigned on the new
                      // date is no longer valid once the date changes.
                      garageId.value = '';
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="facilityId">Garagenanlage</FieldLabel>
                  <Select
                    value={facilityId.value}
                    onValueChange={(value) => {
                      facilityId.value = value ?? '';
                      // The garage list depends on the chosen facility, so a
                      // previously picked garage from a different facility is
                      // no longer valid once the facility changes.
                      garageId.value = '';
                    }}
                  >
                    <SelectTrigger id="facilityId">
                      <SelectValue placeholder="Garagenanlage wählen">
                        {(value: string | null) => (value ? (facilityNameById.get(value) ?? value) : 'Garagenanlage wählen')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {facilities.map((facility) => (
                          <SelectItem key={facility.id} value={facility.id}>
                            {facility.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field data-invalid={!!error.value}>
                  <FieldLabel htmlFor="garageId">Garage</FieldLabel>
                  <Combobox
                    items={garagesForFacility}
                    value={selectedGarage}
                    onValueChange={(garage) => (garageId.value = garage?.id ?? '')}
                    itemToStringValue={(garage) => garage.number}
                    itemToStringLabel={(garage) => garage.number}
                    isItemEqualToValue={(a, b) => a?.id === b?.id}
                    disabled={!facilityId.value}
                  >
                    <ComboboxInput
                      id="garageId"
                      placeholder={facilityId.value ? 'Garage suchen' : 'Zuerst Garagenanlage wählen'}
                      aria-invalid={!!error.value}
                      disabled={!facilityId.value}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>Keine freie Garage am gewählten Datum.</ComboboxEmpty>
                      <ComboboxList>
                        {(garage) => (
                          <ComboboxItem key={garage.id} value={garage}>
                            {garage.number}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {error.value && <FieldError errors={[{ message: error.value }]} />}
                </Field>
              </FieldGroup>
              <DialogFooter className="mt-6">
                <Button type="submit" disabled={isSubmitting.value}>
                  Zuordnen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Garage</TableHead>
            <TableHead>Von</TableHead>
            <TableHead>Bis</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Keine Garagen zugeordnet.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.facilityName} – {item.garageNumber}
              </TableCell>
              <TableCell>{formatDate(item.validFrom)}</TableCell>
              <TableCell>{formatDate(item.validTo)}</TableCell>
              <TableCell className="text-right">
                {!item.validTo && (
                  <Button size="sm" variant="outline" onClick={() => handleEnd(item.id)}>
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
