'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createWorkShiftDepositAmount, endWorkShiftDepositAmount } from '@/app/(app)/_actions/work-shift-deposit-amounts';
import { createWorkShiftDepositAmountSchema } from '@/lib/validation/work-shift-deposit-amount';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon } from '@phosphor-icons/react';

type DepositAmount = { id: string; amount: number; validFrom: string; validTo: string | null };

function formatDate(value: string | null) {
  if (!value) return '–';
  return new Date(value).toLocaleDateString('de-DE');
}

export function WorkShiftDepositAmountManager({ initialItems, canEdit }: { initialItems: DepositAmount[]; canEdit: boolean }) {
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
    const payload = { amount: cents, validFrom: validFrom.value };
    const result = createWorkShiftDepositAmountSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createWorkShiftDepositAmount(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Kautionsbetrag angelegt', type: 'success' });
    open.value = false;
    amountEuro.value = '';
    validFrom.value = '';
    router.refresh();
  }

  async function handleEnd(amountId: string) {
    const result = await endWorkShiftDepositAmount(amountId, { validTo: new Date() });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Kautionsbetrag beendet', type: 'success' });
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
                  Kautionsbetrag hinzufügen
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kautionsbetrag hinzufügen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!errors.value.amount}>
                    <FieldLabel htmlFor="depositAmount">Kaution (€)</FieldLabel>
                    <Input
                      id="depositAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amountEuro.value}
                      onChange={(e) => (amountEuro.value = e.target.value)}
                      aria-invalid={!!errors.value.amount}
                    />
                    {errors.value.amount && <FieldError errors={[{ message: errors.value.amount }]} />}
                  </Field>
                  <Field data-invalid={!!errors.value.validFrom}>
                    <FieldLabel htmlFor="depositValidFrom">Gültig ab</FieldLabel>
                    <Input
                      id="depositValidFrom"
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
            <TableHead>Kaution</TableHead>
            <TableHead>Gültig ab</TableHead>
            <TableHead>Gültig bis</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground">
                Noch kein Kautionsbetrag erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{formatCents(item.amount)}</TableCell>
              <TableCell>{formatDate(item.validFrom)}</TableCell>
              <TableCell>{formatDate(item.validTo)}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  {!item.validTo && (
                    <Button size="sm" variant="outline" onClick={() => handleEnd(item.id)}>
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
