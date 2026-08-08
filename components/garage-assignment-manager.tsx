'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createGarageAssignment, endGarageAssignment } from '@/app/(app)/_actions/garage-assignments';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type GarageOption = { id: string; number: string; facilityName: string };

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
}: {
  memberId: string;
  initialItems: Assignment[];
  availableGarages: GarageOption[];
}) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const garageId = useSignal<string>('');
  const validFrom = useSignal<string>(today());
  const error = useSignal<string | undefined>(undefined);
  const isSubmitting = useSignal(false);

  const garageLabelById = new Map(availableGarages.map((garage) => [garage.id, `${garage.facilityName} – ${garage.number}`]));

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
                <Field data-invalid={!!error.value}>
                  <FieldLabel htmlFor="garageId">Garage</FieldLabel>
                  <Select value={garageId.value} onValueChange={(value) => (garageId.value = value ?? '')}>
                    <SelectTrigger id="garageId">
                      <SelectValue placeholder="Garage wählen">
                        {(value: string | null) => (value ? (garageLabelById.get(value) ?? value) : 'Garage wählen')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {availableGarages.map((garage) => (
                          <SelectItem key={garage.id} value={garage.id}>
                            {garage.facilityName} – {garage.number}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {error.value && <FieldError errors={[{ message: error.value }]} />}
                </Field>
                <Field>
                  <FieldLabel htmlFor="validFrom">Gültig ab</FieldLabel>
                  <Input
                    id="validFrom"
                    type="date"
                    value={validFrom.value}
                    onChange={(e) => (validFrom.value = e.target.value)}
                  />
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
