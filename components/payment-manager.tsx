'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { recordPayment } from '@/app/(app)/_actions/payments';
import { cancelInvoice } from '@/app/(app)/_actions/invoices';
import { createPaymentSchema } from '@/lib/validation/payment';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import { PlusIcon } from '@phosphor-icons/react';

type Payment = { id: string; amount: number; paidAt: string; method: string | null; note: string | null };
type InvoiceType = 'consumption' | 'membershipFee' | 'custom' | 'creditNote';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-DE');
}

export function PaymentManager({
  invoiceId,
  grossAmount,
  status,
  initialItems,
  canRecordPayment,
  invoiceType = 'custom',
}: {
  invoiceId: string;
  grossAmount: number;
  status: 'open' | 'paid' | 'canceled';
  initialItems: Payment[];
  canRecordPayment: boolean;
  invoiceType?: InvoiceType;
}) {
  useSignals();
  const isCreditNote = invoiceType === 'creditNote';
  const router = useRouter();
  const open = useSignal(false);
  const amountEuro = useSignal('');
  const paidAt = useSignal('');
  const method = useSignal('');
  const note = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  const totalPaid = initialItems.reduce((sum, p) => sum + p.amount, 0);
  const remaining = grossAmount - totalPaid;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    // Staff always type a positive euro amount, whether recording a normal
    // payment or a repayment — negate here for creditNote invoices so the
    // stored Payment.amount has the sign lib/billing/record-payment.ts
    // requires (repayment = negative), matching how generate-credit-note.ts
    // also takes positive input and negates internally.
    const cents = Math.round(Number(amountEuro.value.replace(',', '.')) * 100) * (isCreditNote ? -1 : 1);
    const payload = {
      amount: cents,
      paidAt: paidAt.value || undefined,
      method: method.value || undefined,
      note: note.value || undefined,
    };
    const result = createPaymentSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await recordPayment(invoiceId, result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({
        title: isCreditNote ? 'Rückzahlung konnte nicht erfasst werden' : 'Zahlung konnte nicht erfasst werden',
        description: actionResult.error.message,
        type: 'error',
      });
      return;
    }

    toast.add({ title: isCreditNote ? 'Rückzahlung erfasst' : 'Zahlung erfasst', type: 'success' });
    open.value = false;
    amountEuro.value = '';
    paidAt.value = '';
    method.value = '';
    note.value = '';
    router.refresh();
  }

  async function handleCancel() {
    const result = await cancelInvoice(invoiceId);
    if (!result.success) {
      toast.add({ title: 'Stornieren fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Rechnung storniert', type: 'success' });
    router.refresh();
  }

  const canCancel = canRecordPayment && status === 'open' && initialItems.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {status === 'open'
            ? `${isCreditNote ? 'Noch zu erstattender Betrag' : 'Offener Betrag'}: ${formatCents(Math.abs(remaining))}`
            : `${isCreditNote ? 'Erstattet' : 'Bezahlt'}: ${formatCents(Math.abs(totalPaid))}`}
        </p>
        <div className="flex gap-2">
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button size="sm" variant="outline">Stornieren</Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rechnung stornieren?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Stornieren</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canRecordPayment && status === 'open' && (
            <Dialog open={open.value} onOpenChange={(next) => (open.value = next)}>
              <DialogTrigger
                render={
                  <Button size="sm">
                    <PlusIcon data-icon="inline-start" />
                    {isCreditNote ? 'Rückzahlung erfassen' : 'Zahlung erfassen'}
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isCreditNote ? 'Rückzahlung erfassen' : 'Zahlung erfassen'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd}>
                  <FieldGroup>
                    <Field data-invalid={!!errors.value.amount}>
                      <FieldLabel htmlFor="amount">Betrag (€)</FieldLabel>
                      {isCreditNote && <p className="text-xs text-muted-foreground">Positiven Betrag eingeben — wird als Rückzahlung erfasst.</p>}
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
                    <Field data-invalid={!!errors.value.paidAt}>
                      <FieldLabel htmlFor="paidAt">Zahlungsdatum (optional)</FieldLabel>
                      <Input
                        id="paidAt"
                        type="date"
                        value={paidAt.value}
                        onChange={(e) => (paidAt.value = e.target.value)}
                        aria-invalid={!!errors.value.paidAt}
                      />
                      {errors.value.paidAt && <FieldError errors={[{ message: errors.value.paidAt }]} />}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="method">Zahlungsart (optional)</FieldLabel>
                      <Input id="method" value={method.value} onChange={(e) => (method.value = e.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="paymentNote">Notiz (optional)</FieldLabel>
                      <Input id="paymentNote" value={note.value} onChange={(e) => (note.value = e.target.value)} />
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
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Betrag</TableHead>
            <TableHead>Zahlungsart</TableHead>
            <TableHead>Notiz</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Noch keine Zahlungen erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.paidAt)}</TableCell>
              <TableCell>{formatCents(payment.amount)}</TableCell>
              <TableCell>{payment.method ?? '–'}</TableCell>
              <TableCell>{payment.note ?? '–'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
