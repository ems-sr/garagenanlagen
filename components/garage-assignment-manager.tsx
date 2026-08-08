'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
  const garageId = useSignal<string | undefined>(undefined);
  const error = useSignal<string | undefined>(undefined);
  const isSubmitting = useSignal(false);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!garageId.value) {
      error.value = 'Garage erforderlich';
      return;
    }
    error.value = undefined;
    isSubmitting.value = true;

    const response = await fetch('/api/garage-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'member', garageId: garageId.value, clubMemberId: memberId }),
    });

    isSubmitting.value = false;

    if (!response.ok) {
      const { error: apiError } = await response.json();
      toast.add({ title: 'Zuordnung fehlgeschlagen', description: apiError?.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Garage zugeordnet', type: 'success' });
    open.value = false;
    garageId.value = undefined;
    router.refresh();
  }

  async function handleEnd(assignmentId: string) {
    const response = await fetch(`/api/garage-assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validTo: new Date().toISOString() }),
    });
    if (!response.ok) {
      const { error: apiError } = await response.json();
      toast.add({ title: 'Speichern fehlgeschlagen', description: apiError?.message, type: 'error' });
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
                  <Select value={garageId.value} onValueChange={(value) => (garageId.value = value ?? undefined)}>
                    <SelectTrigger id="garageId">
                      <SelectValue placeholder="Garage wählen" />
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
