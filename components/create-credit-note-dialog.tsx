'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { generateCreditNoteAction } from '@/app/(app)/_actions/invoices';
import { createCreditNoteSchema } from '@/lib/validation/invoice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon, XIcon } from '@phosphor-icons/react';

type LineItemDraft = { description: string; quantity: string; unitPrice: string };

const emptyLineItem: LineItemDraft = { description: '', quantity: '1', unitPrice: '' };

export function CreateCreditNoteDialog({ clubMemberId }: { clubMemberId: string }) {
  useSignals();
  const router = useRouter();
  const open = useSignal(false);
  const description = useSignal('');
  const applyVat = useSignal(true);
  const lineItems = useSignal<LineItemDraft[]>([{ ...emptyLineItem }]);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function updateLineItem(index: number, patch: Partial<LineItemDraft>) {
    lineItems.value = lineItems.value.map((item, i) => (i === index ? { ...item, ...patch } : item));
  }

  function addLineItem() {
    lineItems.value = [...lineItems.value, { ...emptyLineItem }];
  }

  function removeLineItem(index: number) {
    lineItems.value = lineItems.value.filter((_, i) => i !== index);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      clubMemberId,
      description: description.value || undefined,
      applyVat: applyVat.value,
      lineItems: lineItems.value.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity.replace(',', '.')),
        unitPrice: Math.round(Number(item.unitPrice.replace(',', '.')) * 100),
      })),
    };
    const result = createCreditNoteSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult = await generateCreditNoteAction(result.data);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Gutschrift konnte nicht erstellt werden', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Gutschrift erstellt', type: 'success' });
    open.value = false;
    description.value = '';
    applyVat.value = true;
    lineItems.value = [{ ...emptyLineItem }];
    router.refresh();
  }

  return (
    <Dialog open={open.value} onOpenChange={(next) => (open.value = next)}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PlusIcon data-icon="inline-start" />
            Gutschrift erstellen
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gutschrift erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.value.description}>
              <FieldLabel htmlFor="creditNoteDescription">Beschreibung</FieldLabel>
              <Input id="creditNoteDescription" value={description.value} onChange={(e) => (description.value = e.target.value)} />
              {errors.value.description && <FieldError errors={[{ message: errors.value.description }]} />}
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="creditNoteApplyVat" checked={applyVat.value} onCheckedChange={(checked) => (applyVat.value = checked === true)} />
              <FieldLabel htmlFor="creditNoteApplyVat" className="font-normal">
                MwSt. anwenden (19%) — korrigiert eine mehrwertsteuerpflichtige Rechnung
              </FieldLabel>
            </Field>
            <div className="flex flex-col gap-2">
              <FieldLabel>Positionen</FieldLabel>
              {lineItems.value.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Input
                    placeholder="Beschreibung"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, { description: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Menge"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Preis (€)"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, { unitPrice: e.target.value })}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={lineItems.value.length <= 1}
                    onClick={() => removeLineItem(index)}
                  >
                    <XIcon />
                    <span className="sr-only">Position entfernen</span>
                  </Button>
                </div>
              ))}
              {errors.value.lineItems && <FieldError errors={[{ message: errors.value.lineItems }]} />}
              <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                <PlusIcon data-icon="inline-start" />
                Position hinzufügen
              </Button>
              <p className="text-xs text-muted-foreground">Positive Beträge eingeben — wird als Gutschrift (negativer Betrag) gebucht.</p>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting.value}>
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
