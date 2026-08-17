'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  generateBulkInvoices,
  generateBulkMembershipFeeInvoicesAction,
  generateCustomInvoiceAction,
} from '@/app/(app)/_actions/invoices';
import { createCustomInvoiceSchema, createBulkMembershipFeeInvoicesSchema } from '@/lib/validation/invoice';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { EyeIcon, ReceiptIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  type: 'consumption' | 'membershipFee' | 'custom' | 'creditNote';
  memberName: string;
  garageNumber: string;
  periodStart: string;
  periodEnd: string;
  consumptionKwh: string | null;
  grossAmount: number;
  openAmount: number;
  status: 'open' | 'partiallyPaid' | 'paid' | 'canceled';
};

const STATUS_LABEL: Record<InvoiceRow['status'], string> = {
  open: 'Offen',
  partiallyPaid: 'Teilzahlung',
  paid: 'Bezahlt',
  canceled: 'Storniert',
};
const STATUS_VARIANT: Record<InvoiceRow['status'], 'outline' | 'secondary' | 'default' | 'destructive'> = {
  open: 'outline',
  partiallyPaid: 'secondary',
  paid: 'default',
  canceled: 'destructive',
};
const TYPE_LABEL: Record<InvoiceRow['type'], string> = {
  consumption: 'Verbrauch',
  membershipFee: 'Beitrag',
  custom: 'Sonstige',
  creditNote: 'Gutschrift',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-DE');
}

type LineItemDraft = { description: string; quantity: string; unitPrice: string };

type PrefillTemplate = {
  id: string;
  name: string;
  lineItems: { description: string; quantity: string; unitPrice: number | null }[];
};

const NO_TEMPLATE = 'none';

// Offered as a quick-fill for the period fields below (Jan 1 – Dec 31 of the
// chosen year) — periodStart/periodEnd stay the source of truth the form
// submits, so a manual date afterwards still overrides the year pick.
function duesYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, i) => currentYear + 1 - i);
}

export function InvoiceList({
  facilityId,
  items,
  members,
  prefillTemplates,
  canGenerate,
}: {
  facilityId: string;
  items: InvoiceRow[];
  members: { id: string; name: string }[];
  prefillTemplates: PrefillTemplate[];
  canGenerate: boolean;
}) {
  useSignals();
  const router = useRouter();
  const statusFilter = useSignal<'all' | InvoiceRow['status']>('open');
  const isGenerating = useSignal(false);

  const duesOpen = useSignal(false);
  const duesYear = useSignal('');
  const duesPeriodStart = useSignal('');
  const duesPeriodEnd = useSignal('');
  const isDuesSubmitting = useSignal(false);

  const customOpen = useSignal(false);
  const customMemberId = useSignal('');
  const customDescription = useSignal('');
  const customTemplateId = useSignal(NO_TEMPLATE);
  const customLineItems = useSignal<LineItemDraft[]>([{ description: '', quantity: '1', unitPrice: '' }]);
  const customErrors = useSignal<Record<string, string>>({});
  const isCustomSubmitting = useSignal(false);

  const filtered = items.filter((item) => statusFilter.value === 'all' || item.status === statusFilter.value);

  async function handleGenerateBulk() {
    isGenerating.value = true;
    const result = await generateBulkInvoices({ facilityId });
    isGenerating.value = false;

    if (!result.success) {
      toast.add({ title: 'Rechnungslauf fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }

    const { created, skipped } = result.data;
    const skipReasons = new Map<string, number>();
    for (const { error } of skipped) {
      skipReasons.set(error.message, (skipReasons.get(error.message) ?? 0) + 1);
    }
    const skipSummary = [...skipReasons.entries()].map(([message, count]) => `${count}× ${message}`).join(' ');

    toast.add({
      title: `${created.length} Rechnung(en) erstellt`,
      description: skipped.length > 0 ? `${skipped.length} Garage(n) übersprungen: ${skipSummary}` : undefined,
      type: created.length > 0 ? 'success' : 'info',
    });
    router.refresh();
  }

  async function handleGenerateDues(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createBulkMembershipFeeInvoicesSchema.safeParse({
      periodStart: duesPeriodStart.value,
      periodEnd: duesPeriodEnd.value,
    });
    if (!parsed.success) {
      toast.add({ title: 'Ungültiger Zeitraum', description: parsed.error.issues[0]?.message, type: 'error' });
      return;
    }

    isDuesSubmitting.value = true;
    const result = await generateBulkMembershipFeeInvoicesAction(parsed.data);
    isDuesSubmitting.value = false;

    if (!result.success) {
      toast.add({ title: 'Beitragslauf fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }

    const { created, skipped } = result.data;
    toast.add({
      title: `${created.length} Beitragsrechnung(en) erstellt`,
      description: skipped.length > 0 ? `${skipped.length} Mitglied(er) übersprungen.` : undefined,
      type: created.length > 0 ? 'success' : 'info',
    });
    duesOpen.value = false;
    duesYear.value = '';
    duesPeriodStart.value = '';
    duesPeriodEnd.value = '';
    router.refresh();
  }

  function applyDuesYear(year: string) {
    duesYear.value = year;
    duesPeriodStart.value = `${year}-01-01`;
    duesPeriodEnd.value = `${year}-12-31`;
  }

  function updateLineItem(index: number, patch: Partial<LineItemDraft>) {
    customLineItems.value = customLineItems.value.map((item, i) => (i === index ? { ...item, ...patch } : item));
  }

  function addLineItem() {
    customLineItems.value = [...customLineItems.value, { description: '', quantity: '1', unitPrice: '' }];
  }

  function removeLineItem(index: number) {
    customLineItems.value = customLineItems.value.filter((_, i) => i !== index);
  }

  function applyTemplate(templateId: string) {
    customTemplateId.value = templateId;
    if (templateId === NO_TEMPLATE) return;

    const template = prefillTemplates.find((t) => t.id === templateId);
    if (!template) return;

    customDescription.value = template.name;
    customLineItems.value = template.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice != null ? (item.unitPrice / 100).toString() : '',
    }));
  }

  async function handleGenerateCustom(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      clubMemberId: customMemberId.value,
      description: customDescription.value || undefined,
      lineItems: customLineItems.value.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity.replace(',', '.')),
        unitPrice: Math.round(Number(item.unitPrice.replace(',', '.')) * 100),
      })),
    };
    const result = createCustomInvoiceSchema.safeParse(payload);
    if (!result.success) {
      customErrors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    customErrors.value = {};
    isCustomSubmitting.value = true;

    const actionResult = await generateCustomInvoiceAction(result.data);

    isCustomSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Rechnung fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Rechnung erstellt', type: 'success' });
    customOpen.value = false;
    customMemberId.value = '';
    customDescription.value = '';
    customTemplateId.value = NO_TEMPLATE;
    customLineItems.value = [{ description: '', quantity: '1', unitPrice: '' }];
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select value={statusFilter.value} onValueChange={(value) => (statusFilter.value = value as typeof statusFilter.value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="partiallyPaid">Teilzahlung</SelectItem>
              <SelectItem value="paid">Bezahlt</SelectItem>
              <SelectItem value="canceled">Storniert</SelectItem>
              <SelectItem value="all">Alle</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {canGenerate && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleGenerateBulk} disabled={isGenerating.value}>
              <ReceiptIcon data-icon="inline-start" />
              Verbrauchsrechnungen erstellen
            </Button>

            <Dialog open={duesOpen.value} onOpenChange={(next) => (duesOpen.value = next)}>
              <DialogTrigger render={<Button size="sm" variant="outline">Beitragsrechnungen erstellen</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Beitragsrechnungen erstellen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGenerateDues}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="duesYear">Jahr</FieldLabel>
                      <Select value={duesYear.value} onValueChange={(value) => applyDuesYear(value ?? '')}>
                        <SelectTrigger id="duesYear">
                          <SelectValue placeholder="Jahr auswählen">
                            {(value: string | null) => value || 'Jahr auswählen'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {duesYearOptions().map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="duesPeriodStart">Zeitraumbeginn</FieldLabel>
                      <Input
                        id="duesPeriodStart"
                        type="date"
                        value={duesPeriodStart.value}
                        onChange={(e) => (duesPeriodStart.value = e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="duesPeriodEnd">Zeitraumende</FieldLabel>
                      <Input
                        id="duesPeriodEnd"
                        type="date"
                        value={duesPeriodEnd.value}
                        onChange={(e) => (duesPeriodEnd.value = e.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={isDuesSubmitting.value}>
                      Erstellen
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={customOpen.value} onOpenChange={(next) => (customOpen.value = next)}>
              <DialogTrigger
                render={
                  <Button size="sm" variant="outline">
                    <PlusIcon data-icon="inline-start" />
                    Rechnung erstellen
                  </Button>
                }
              />
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Rechnung erstellen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGenerateCustom}>
                  <FieldGroup>
                    <Field data-invalid={!!customErrors.value.clubMemberId}>
                      <FieldLabel htmlFor="customMember">Mitglied</FieldLabel>
                      <Select value={customMemberId.value} onValueChange={(value) => (customMemberId.value = value ?? '')}>
                        <SelectTrigger id="customMember">
                          <SelectValue placeholder="Mitglied auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {customErrors.value.clubMemberId && <FieldError errors={[{ message: customErrors.value.clubMemberId }]} />}
                    </Field>
                    {prefillTemplates.length > 0 && (
                      <Field>
                        <FieldLabel htmlFor="customTemplate">Vorlage (optional)</FieldLabel>
                        <Select value={customTemplateId.value} onValueChange={(value) => applyTemplate(value ?? NO_TEMPLATE)}>
                          <SelectTrigger id="customTemplate">
                            <SelectValue>
                              {(value: string | null) =>
                                value && value !== NO_TEMPLATE
                                  ? (prefillTemplates.find((t) => t.id === value)?.name ?? value)
                                  : 'Keine Vorlage'
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value={NO_TEMPLATE}>Keine Vorlage</SelectItem>
                              {prefillTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                    <Field data-invalid={!!customErrors.value.description}>
                      <FieldLabel htmlFor="customDescription">Beschreibung</FieldLabel>
                      <Input
                        id="customDescription"
                        value={customDescription.value}
                        onChange={(e) => (customDescription.value = e.target.value)}
                      />
                    </Field>
                    <div className="flex flex-col gap-2">
                      <FieldLabel>Positionen</FieldLabel>
                      {customLineItems.value.map((item, index) => (
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
                            disabled={customLineItems.value.length <= 1}
                            onClick={() => removeLineItem(index)}
                          >
                            <TrashIcon />
                            <span className="sr-only">Position entfernen</span>
                          </Button>
                        </div>
                      ))}
                      {customErrors.value.lineItems && <FieldError errors={[{ message: customErrors.value.lineItems }]} />}
                      <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                        <PlusIcon data-icon="inline-start" />
                        Position hinzufügen
                      </Button>
                    </div>
                  </FieldGroup>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={isCustomSubmitting.value}>
                      Erstellen
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rechnungsnr.</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Mitglied</TableHead>
            <TableHead>Garage</TableHead>
            <TableHead>Zeitraum</TableHead>
            <TableHead>Verbrauch</TableHead>
            <TableHead>Betrag</TableHead>
            <TableHead>Offener Betrag</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">
                Keine Rechnungen gefunden.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>{invoice.invoiceNumber}</TableCell>
              <TableCell>{TYPE_LABEL[invoice.type]}</TableCell>
              <TableCell>{invoice.memberName}</TableCell>
              <TableCell>{invoice.garageNumber}</TableCell>
              <TableCell>
                {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
              </TableCell>
              <TableCell>{invoice.consumptionKwh ? `${invoice.consumptionKwh} kWh` : '–'}</TableCell>
              <TableCell>{formatCents(invoice.grossAmount)}</TableCell>
              <TableCell>{invoice.status === 'canceled' ? '–' : formatCents(invoice.openAmount)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/rechnungen/${invoice.id}`}>
                  <Button size="icon-sm" variant="ghost">
                    <EyeIcon />
                    <span className="sr-only">Ansehen</span>
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
