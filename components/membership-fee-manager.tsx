'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createMembershipFee, endMembershipFee } from '@/app/(app)/_actions/membership-fees';
import { createMembershipFeeSchema } from '@/lib/validation/membership-fee';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon } from '@phosphor-icons/react';

type Fee = { id: string; description: string | null; amount: number; validFrom: string; validTo: string | null };

function formatDate(value: string | null) {
  if (!value) return '–';
  return new Date(value).toLocaleDateString('de-DE');
}

export function MembershipFeeManager({ initialItems, canEdit }: { initialItems: Fee[]; canEdit: boolean }) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const description = useSignal('');
  const amountEuro = useSignal('');
  const validFrom = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    const cents = Math.round(Number(amountEuro.value.replace(',', '.')) * 100);
    const payload = { description: description.value || undefined, amount: cents, validFrom: validFrom.value };
    const result = createMembershipFeeSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await createMembershipFee(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Mitgliedsbeitrag angelegt', type: 'success' });
    open.value = false;
    description.value = '';
    amountEuro.value = '';
    validFrom.value = '';
    router.refresh();
  }

  async function handleEnd(feeId: string) {
    const result = await endMembershipFee(feeId, { validTo: new Date() });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Mitgliedsbeitrag beendet', type: 'success' });
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
                  Beitrag hinzufügen
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mitgliedsbeitrag hinzufügen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd}>
                <FieldGroup>
                  <Field data-invalid={!!errors.value.description}>
                    <FieldLabel htmlFor="description">Bezeichnung</FieldLabel>
                    <Input
                      id="description"
                      placeholder="Jahresbeitrag"
                      value={description.value}
                      onChange={(e) => (description.value = e.target.value)}
                      aria-invalid={!!errors.value.description}
                    />
                    {errors.value.description && <FieldError errors={[{ message: errors.value.description }]} />}
                  </Field>
                  <Field data-invalid={!!errors.value.amount}>
                    <FieldLabel htmlFor="amount">Betrag (€)</FieldLabel>
                    <Input
                      id="amount"
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
            <TableHead>Bezeichnung</TableHead>
            <TableHead>Betrag</TableHead>
            <TableHead>Gültig ab</TableHead>
            <TableHead>Gültig bis</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">
                Noch kein Mitgliedsbeitrag erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((fee) => (
            <TableRow key={fee.id}>
              <TableCell>{fee.description ?? 'Mitgliedsbeitrag'}</TableCell>
              <TableCell>{formatCents(fee.amount)}</TableCell>
              <TableCell>{formatDate(fee.validFrom)}</TableCell>
              <TableCell>{formatDate(fee.validTo)}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  {!fee.validTo && (
                    <Button size="sm" variant="outline" onClick={() => handleEnd(fee.id)}>
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
