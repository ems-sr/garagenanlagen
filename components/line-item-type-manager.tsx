'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createLineItemType as createLineItemTypeAction,
  updateLineItemType as updateLineItemTypeAction,
  deleteLineItemType as deleteLineItemTypeAction,
} from '@/app/(app)/_actions/line-item-types';
import { createLineItemTypeSchema } from '@/lib/validation/line-item-type';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import { PlusIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

export type LineItemAmountSource = 'fixed' | 'membershipFeeRate' | 'workShiftDepositRate';

export const AMOUNT_SOURCE_LABELS: Record<LineItemAmountSource, string> = {
  fixed: 'Fixbetrag',
  membershipFeeRate: 'Mitgliedsbeitrag (aktueller Satz)',
  workShiftDepositRate: 'Kaution Arbeitseinsatz (aktueller Satz)',
};

export type LineItemTypeRow = {
  id: string;
  name: string;
  description: string | null;
  amountSource: LineItemAmountSource;
  defaultAmount: number | null;
};

type FormValues = { name: string; description: string; amountSource: LineItemAmountSource; defaultAmountEuro: string };

const emptyForm: FormValues = { name: '', description: '', amountSource: 'fixed', defaultAmountEuro: '' };

function toFormValues(item: LineItemTypeRow): FormValues {
  return {
    name: item.name,
    description: item.description ?? '',
    amountSource: item.amountSource,
    defaultAmountEuro: item.defaultAmount != null ? (item.defaultAmount / 100).toString() : '',
  };
}

function LineItemTypeFormDialog({
  trigger,
  title,
  initialValues,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initialValues: FormValues;
  onSubmit: (values: FormValues) => Promise<boolean>;
}) {
  useSignals();
  const open = useSignal(false);
  const values = useSignal<FormValues>(initialValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    values.value = { ...values.value, [key]: value };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      name: values.value.name,
      description: values.value.description || undefined,
      amountSource: values.value.amountSource,
      defaultAmount:
        values.value.amountSource === 'fixed' && values.value.defaultAmountEuro !== ''
          ? Math.round(Number(values.value.defaultAmountEuro.replace(',', '.')) * 100)
          : undefined,
    };
    const result = createLineItemTypeSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;
    let ok = false;
    try {
      ok = await onSubmit(values.value);
    } finally {
      isSubmitting.value = false;
    }

    if (ok) {
      open.value = false;
      values.value = emptyForm;
    }
  }

  return (
    <Dialog
      open={open.value}
      onOpenChange={(next) => {
        open.value = next;
        if (next) values.value = initialValues;
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.value.name}>
              <FieldLabel htmlFor="lineItemTypeName">Name</FieldLabel>
              <Input
                id="lineItemTypeName"
                placeholder="z. B. Kaution Arbeitseinsatz"
                value={values.value.name}
                onChange={(e) => setField('name', e.target.value)}
                aria-invalid={!!errors.value.name}
              />
              {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
            </Field>
            <Field data-invalid={!!errors.value.description}>
              <FieldLabel htmlFor="lineItemTypeDescription">Beschreibung (optional)</FieldLabel>
              <Input
                id="lineItemTypeDescription"
                value={values.value.description}
                onChange={(e) => setField('description', e.target.value)}
              />
              {errors.value.description && <FieldError errors={[{ message: errors.value.description }]} />}
            </Field>
            <Field>
              <FieldLabel htmlFor="lineItemTypeAmountSource">Betragsquelle</FieldLabel>
              <Select
                value={values.value.amountSource}
                onValueChange={(value) => setField('amountSource', value as LineItemAmountSource)}
              >
                <SelectTrigger id="lineItemTypeAmountSource">
                  <SelectValue>{(value: LineItemAmountSource | null) => (value ? AMOUNT_SOURCE_LABELS[value] : '')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(AMOUNT_SOURCE_LABELS) as LineItemAmountSource[]).map((source) => (
                      <SelectItem key={source} value={source}>
                        {AMOUNT_SOURCE_LABELS[source]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {values.value.amountSource === 'fixed' && (
              <Field data-invalid={!!errors.value.defaultAmount}>
                <FieldLabel htmlFor="lineItemTypeDefaultAmount">Betrag (€)</FieldLabel>
                <Input
                  id="lineItemTypeDefaultAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={values.value.defaultAmountEuro}
                  onChange={(e) => setField('defaultAmountEuro', e.target.value)}
                  aria-invalid={!!errors.value.defaultAmount}
                />
                {errors.value.defaultAmount && <FieldError errors={[{ message: errors.value.defaultAmount }]} />}
              </Field>
            )}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting.value}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LineItemTypeManager({ initialItems, canEdit }: { initialItems: LineItemTypeRow[]; canEdit: boolean }) {
  useSignals();
  const router = useRouter();

  function toPayload(values: FormValues) {
    return {
      name: values.name,
      description: values.description || undefined,
      amountSource: values.amountSource,
      defaultAmount:
        values.amountSource === 'fixed' && values.defaultAmountEuro !== ''
          ? Math.round(Number(values.defaultAmountEuro.replace(',', '.')) * 100)
          : undefined,
    };
  }

  async function createLineItemType(values: FormValues): Promise<boolean> {
    const result = await createLineItemTypeAction(toPayload(values));
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Rechnungsposten-Typ angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateLineItemType(id: string, values: FormValues): Promise<boolean> {
    const result = await updateLineItemTypeAction(id, toPayload(values));
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Rechnungsposten-Typ aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteLineItemType(id: string) {
    const result = await deleteLineItemTypeAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Rechnungsposten-Typ gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <LineItemTypeFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Rechnungsposten-Typ anlegen
              </Button>
            }
            title="Rechnungsposten-Typ anlegen"
            initialValues={emptyForm}
            onSubmit={createLineItemType}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Betragsquelle</TableHead>
            <TableHead>Betrag</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground">
                Noch kein Rechnungsposten-Typ erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{AMOUNT_SOURCE_LABELS[item.amountSource]}</TableCell>
              <TableCell>{item.amountSource === 'fixed' && item.defaultAmount != null ? formatCents(item.defaultAmount) : '–'}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <LineItemTypeFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Rechnungsposten-Typ bearbeiten"
                      initialValues={toFormValues(item)}
                      onSubmit={(values) => updateLineItemType(item.id, values)}
                    />
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
                          <AlertDialogTitle>Rechnungsposten-Typ löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteLineItemType(item.id)}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
