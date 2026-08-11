'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createInvoiceTemplate as createInvoiceTemplateAction,
  updateInvoiceTemplate as updateInvoiceTemplateAction,
  deleteInvoiceTemplate as deleteInvoiceTemplateAction,
} from '@/app/(app)/_actions/invoice-templates';
import { createInvoiceTemplateSchema } from '@/lib/validation/invoice-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PlusIcon, PencilSimpleIcon, TrashIcon, XIcon } from '@phosphor-icons/react';

type TemplateInvoiceType = 'membershipFee' | 'custom';

const INVOICE_TYPE_LABELS: Record<TemplateInvoiceType, string> = {
  membershipFee: 'Mitgliedsbeitrag',
  custom: 'Individuell',
};

export type LineItemTypeOption = { id: string; name: string };

export type InvoiceTemplateLineItemRow = {
  lineItemTypeId: string;
  quantity: string;
  overrideAmountEuro: string;
};

export type InvoiceTemplateRow = {
  id: string;
  name: string;
  invoiceType: TemplateInvoiceType;
  autoGenerate: boolean;
  lineItems: InvoiceTemplateLineItemRow[];
};

type FormValues = {
  name: string;
  invoiceType: TemplateInvoiceType;
  autoGenerate: boolean;
  lineItems: InvoiceTemplateLineItemRow[];
};

const emptyLineItem: InvoiceTemplateLineItemRow = { lineItemTypeId: '', quantity: '1', overrideAmountEuro: '' };

function emptyForm(): FormValues {
  return { name: '', invoiceType: 'membershipFee', autoGenerate: false, lineItems: [{ ...emptyLineItem }] };
}

function toFormValues(item: InvoiceTemplateRow): FormValues {
  return {
    name: item.name,
    invoiceType: item.invoiceType,
    autoGenerate: item.autoGenerate,
    lineItems: item.lineItems.length > 0 ? item.lineItems.map((li) => ({ ...li })) : [{ ...emptyLineItem }],
  };
}

function toPayload(values: FormValues) {
  return {
    name: values.name,
    invoiceType: values.invoiceType,
    autoGenerate: values.autoGenerate,
    lineItems: values.lineItems
      .filter((li) => li.lineItemTypeId !== '')
      .map((li) => ({
        lineItemTypeId: li.lineItemTypeId,
        quantity: Number(li.quantity.replace(',', '.')),
        overrideAmount: li.overrideAmountEuro !== '' ? Math.round(Number(li.overrideAmountEuro.replace(',', '.')) * 100) : undefined,
      })),
  };
}

function InvoiceTemplateFormDialog({
  trigger,
  title,
  initialValues,
  lineItemTypes,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initialValues: FormValues;
  lineItemTypes: LineItemTypeOption[];
  onSubmit: (values: FormValues) => Promise<boolean>;
}) {
  useSignals();
  const open = useSignal(false);
  const values = useSignal<FormValues>(initialValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);
  const lineItemTypeById = new Map(lineItemTypes.map((type) => [type.id, type.name]));

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    values.value = { ...values.value, [key]: value };
  }

  function updateLineItem(index: number, patch: Partial<InvoiceTemplateLineItemRow>) {
    values.value = {
      ...values.value,
      lineItems: values.value.lineItems.map((li, i) => (i === index ? { ...li, ...patch } : li)),
    };
  }

  function addLineItem() {
    values.value = { ...values.value, lineItems: [...values.value.lineItems, { ...emptyLineItem }] };
  }

  function removeLineItem(index: number) {
    values.value = { ...values.value, lineItems: values.value.lineItems.filter((_, i) => i !== index) };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = toPayload(values.value);
    const result = createInvoiceTemplateSchema.safeParse(payload);
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
      values.value = emptyForm();
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.value.name}>
              <FieldLabel htmlFor="templateName">Name</FieldLabel>
              <Input
                id="templateName"
                placeholder="z. B. Jahresrechnung"
                value={values.value.name}
                onChange={(e) => setField('name', e.target.value)}
                aria-invalid={!!errors.value.name}
              />
              {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
            </Field>
            <Field>
              <FieldLabel htmlFor="templateInvoiceType">Rechnungsart</FieldLabel>
              <Select value={values.value.invoiceType} onValueChange={(value) => setField('invoiceType', value as TemplateInvoiceType)}>
                <SelectTrigger id="templateInvoiceType">
                  <SelectValue>{(value: TemplateInvoiceType | null) => (value ? INVOICE_TYPE_LABELS[value] : '')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(INVOICE_TYPE_LABELS) as TemplateInvoiceType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {INVOICE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="templateAutoGenerate"
                checked={values.value.autoGenerate}
                onCheckedChange={(checked) => setField('autoGenerate', checked === true)}
              />
              <FieldLabel htmlFor="templateAutoGenerate" className="font-normal">
                Automatisch bei der Rechnungserstellung anwenden (statt nur als Vorbelegung anzubieten)
              </FieldLabel>
            </Field>

            <div className="flex flex-col gap-2">
              <FieldLabel>Rechnungsposten</FieldLabel>
              {values.value.lineItems.map((lineItem, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Select
                    value={lineItem.lineItemTypeId}
                    onValueChange={(value) => updateLineItem(index, { lineItemTypeId: value ?? '' })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue>
                        {(value: string | null) => (value ? (lineItemTypeById.get(value) ?? value) : 'Rechnungsposten-Typ')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {lineItemTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    className="w-16"
                    placeholder="Menge"
                    value={lineItem.quantity}
                    onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-24"
                    placeholder="Betrag €"
                    value={lineItem.overrideAmountEuro}
                    onChange={(e) => updateLineItem(index, { overrideAmountEuro: e.target.value })}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={values.value.lineItems.length <= 1}
                    onClick={() => removeLineItem(index)}
                  >
                    <XIcon />
                    <span className="sr-only">Entfernen</span>
                  </Button>
                </div>
              ))}
              {errors.value.lineItems && <FieldError errors={[{ message: errors.value.lineItems }]} />}
              <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                <PlusIcon data-icon="inline-start" />
                Posten hinzufügen
              </Button>
            </div>
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

export function InvoiceTemplateManager({
  initialItems,
  lineItemTypes,
  canEdit,
}: {
  initialItems: InvoiceTemplateRow[];
  lineItemTypes: LineItemTypeOption[];
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();
  const lineItemTypeById = new Map(lineItemTypes.map((type) => [type.id, type.name]));

  async function createTemplate(values: FormValues): Promise<boolean> {
    const result = await createInvoiceTemplateAction(toPayload(values));
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Rechnungsvorlage angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateTemplate(id: string, values: FormValues): Promise<boolean> {
    const result = await updateInvoiceTemplateAction(id, toPayload(values));
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Rechnungsvorlage aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteTemplate(id: string) {
    const result = await deleteInvoiceTemplateAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Rechnungsvorlage gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <InvoiceTemplateFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Rechnungsvorlage anlegen
              </Button>
            }
            title="Rechnungsvorlage anlegen"
            initialValues={emptyForm()}
            lineItemTypes={lineItemTypes}
            onSubmit={createTemplate}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Rechnungsart</TableHead>
            <TableHead>Modus</TableHead>
            <TableHead>Posten</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">
                Noch keine Rechnungsvorlage erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{INVOICE_TYPE_LABELS[item.invoiceType]}</TableCell>
              <TableCell>{item.autoGenerate ? 'Automatisch' : 'Vorbelegung'}</TableCell>
              <TableCell>{item.lineItems.map((li) => lineItemTypeById.get(li.lineItemTypeId) ?? '?').join(', ')}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <InvoiceTemplateFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Rechnungsvorlage bearbeiten"
                      initialValues={toFormValues(item)}
                      lineItemTypes={lineItemTypes}
                      onSubmit={(values) => updateTemplate(item.id, values)}
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
                          <AlertDialogTitle>Rechnungsvorlage löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTemplate(item.id)}>Löschen</AlertDialogAction>
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
