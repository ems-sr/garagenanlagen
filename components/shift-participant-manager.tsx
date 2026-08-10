'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { addParticipantAction, removeParticipantAction, recordPayoutAction } from '@/app/(app)/_actions/work-shifts';
import { addParticipantSchema } from '@/lib/validation/work-shift';
import { breakdownIntoDenominations } from '@/lib/cash/denomination-breakdown';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { toast } from '@/components/ui/toast';
import { PlusIcon, TrashIcon, CashRegisterIcon } from '@phosphor-icons/react';

type Participant = {
  id: string;
  clubMemberId: string;
  memberName: string;
  hoursWorked: string;
  reimbursementAmount: number;
  paidOut: boolean;
  paidOutAt: string | null;
};

function formatDenomination(cents: number): string {
  return cents >= 100 ? `${cents / 100} €` : `${cents} Cent`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ShiftParticipantManager({
  workShiftId,
  initialItems,
  eligibleMembers,
  canEdit,
}: {
  workShiftId: string;
  initialItems: Participant[];
  eligibleMembers: { id: string; name: string }[];
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();

  const addOpen = useSignal(false);
  const addMemberId = useSignal('');
  const addHours = useSignal('');
  const addErrors = useSignal<Record<string, string>>({});
  const isAdding = useSignal(false);

  const payoutParticipantId = useSignal<string | null>(null);
  const isPayingOut = useSignal(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const payload = { clubMemberId: addMemberId.value, hoursWorked: addHours.value };
    const result = addParticipantSchema.safeParse(payload);
    if (!result.success) {
      addErrors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    addErrors.value = {};
    isAdding.value = true;

    const actionResult = await addParticipantAction(workShiftId, result.data);

    isAdding.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Hinzufügen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Teilnehmer hinzugefügt', type: 'success' });
    addOpen.value = false;
    addMemberId.value = '';
    addHours.value = '';
    router.refresh();
  }

  async function handleRemove(participantId: string) {
    const result = await removeParticipantAction(participantId);
    if (!result.success) {
      toast.add({ title: 'Entfernen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Teilnehmer entfernt', type: 'success' });
    router.refresh();
  }

  async function handleConfirmPayout() {
    if (!payoutParticipantId.value) return;
    isPayingOut.value = true;
    const result = await recordPayoutAction(payoutParticipantId.value);
    isPayingOut.value = false;

    if (!result.success) {
      toast.add({ title: 'Auszahlung fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Auszahlung vermerkt', type: 'success' });
    payoutParticipantId.value = null;
    router.refresh();
  }

  const payoutParticipant = initialItems.find((p) => p.id === payoutParticipantId.value);
  const payoutBreakdown = payoutParticipant ? breakdownIntoDenominations(payoutParticipant.reimbursementAmount) : [];

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={addOpen.value} onOpenChange={(next) => (addOpen.value = next)}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Teilnehmer hinzufügen
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Teilnehmer hinzufügen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!addErrors.value.clubMemberId}>
                    <FieldLabel htmlFor="participantMember">Mitglied</FieldLabel>
                    <Select value={addMemberId.value} onValueChange={(value) => (addMemberId.value = value ?? '')}>
                      <SelectTrigger id="participantMember">
                        <SelectValue placeholder="Mitglied auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {eligibleMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {addErrors.value.clubMemberId && <FieldError errors={[{ message: addErrors.value.clubMemberId }]} />}
                  </Field>
                  <Field data-invalid={!!addErrors.value.hoursWorked}>
                    <FieldLabel htmlFor="participantHours">Stunden</FieldLabel>
                    <Input
                      id="participantHours"
                      type="number"
                      step="0.25"
                      min="0"
                      value={addHours.value}
                      onChange={(e) => (addHours.value = e.target.value)}
                      aria-invalid={!!addErrors.value.hoursWorked}
                    />
                    {addErrors.value.hoursWorked && <FieldError errors={[{ message: addErrors.value.hoursWorked }]} />}
                  </Field>
                </FieldGroup>
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={isAdding.value}>
                    Hinzufügen
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
            <TableHead>Mitglied</TableHead>
            <TableHead>Stunden</TableHead>
            <TableHead>Aufwandsentschädigung</TableHead>
            <TableHead>Status</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">
                Noch kein Teilnehmer erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((participant) => (
            <TableRow key={participant.id}>
              <TableCell>{participant.memberName}</TableCell>
              <TableCell>{participant.hoursWorked}</TableCell>
              <TableCell>{formatCents(participant.reimbursementAmount)}</TableCell>
              <TableCell>
                {participant.paidOut ? (
                  <Badge variant="secondary">Ausgezahlt{participant.paidOutAt ? ` · ${formatDateTime(participant.paidOutAt)}` : ''}</Badge>
                ) : (
                  <Badge variant="outline">Offen</Badge>
                )}
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!participant.paidOut && (
                      <Button size="sm" variant="outline" onClick={() => (payoutParticipantId.value = participant.id)}>
                        <CashRegisterIcon data-icon="inline-start" />
                        Bar auszahlen
                      </Button>
                    )}
                    {!participant.paidOut && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button size="icon-sm" variant="ghost">
                              <TrashIcon />
                              <span className="sr-only">Entfernen</span>
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Teilnehmer entfernen?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(participant.id)}>Entfernen</AlertDialogAction>
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

      <Dialog open={!!payoutParticipantId.value} onOpenChange={(next) => !next && (payoutParticipantId.value = null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bar auszahlen{payoutParticipant ? ` — ${payoutParticipant.memberName}` : ''}</DialogTitle>
          </DialogHeader>
          {payoutParticipant && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Auszuzahlender Betrag: <span className="font-medium text-foreground">{formatCents(payoutParticipant.reimbursementAmount)}</span>
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stückelung</TableHead>
                    <TableHead className="text-right">Anzahl</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutBreakdown.map((entry) => (
                    <TableRow key={entry.denomination}>
                      <TableCell>{formatDenomination(entry.denomination)}</TableCell>
                      <TableCell className="text-right">{entry.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => (payoutParticipantId.value = null)}>
              Abbrechen
            </Button>
            <Button onClick={handleConfirmPayout} disabled={isPayingOut.value}>
              Auszahlung bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
