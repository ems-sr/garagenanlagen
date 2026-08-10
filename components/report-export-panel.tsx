'use client';

import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { FilePdfIcon } from '@phosphor-icons/react';

const ALL_FACILITIES = 'all';
const ALL_TYPES = 'all';

const TYPE_OPTIONS = [
  { value: ALL_TYPES, label: 'Alle Typen' },
  { value: 'consumption', label: 'Verbrauch' },
  { value: 'membershipFee', label: 'Beitrag' },
  { value: 'custom', label: 'Sonstige' },
];

// One shared panel for all three PDF report types — they differ only in
// which filter fields apply and which API route they call, not in overall
// shape, so a `kind` switch beats three near-duplicate components.
export function ReportExportPanel({
  kind,
  facilities,
}: {
  kind: 'member-list' | 'financial-report' | 'invoice-run';
  facilities: { id: string; name: string }[];
}) {
  useSignals();
  const activeOnly = useSignal(false);
  const facilityId = useSignal(ALL_FACILITIES);
  const dateFrom = useSignal('');
  const dateTo = useSignal('');
  const type = useSignal(ALL_TYPES);

  const needsDateRange = kind !== 'member-list';

  function buildUrl(): string | null {
    const params = new URLSearchParams();

    if (kind === 'member-list') {
      if (activeOnly.value) params.set('activeOnly', 'true');
    } else {
      if (!dateFrom.value || !dateTo.value) return null;
      params.set('dateFrom', dateFrom.value);
      params.set('dateTo', dateTo.value);
    }

    if (facilityId.value !== ALL_FACILITIES) params.set('facilityId', facilityId.value);
    if (kind === 'invoice-run' && type.value !== ALL_TYPES) params.set('type', type.value);

    const path =
      kind === 'member-list' ? '/api/reports/member-list' : kind === 'financial-report' ? '/api/reports/financial-report' : '/api/reports/invoice-run';
    return `${path}?${params.toString()}`;
  }

  function handleExport() {
    const url = buildUrl();
    if (!url) {
      toast.add({ title: 'Zeitraum erforderlich', description: 'Bitte Start- und Enddatum angeben.', type: 'error' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="flex-row flex-wrap gap-4">
        {kind === 'member-list' && (
          <Field className="w-48">
            <FieldLabel htmlFor="reportActiveOnly">Status</FieldLabel>
            <Select value={activeOnly.value ? 'active' : 'all'} onValueChange={(value) => (activeOnly.value = value === 'active')}>
              <SelectTrigger id="reportActiveOnly">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Alle Mitglieder</SelectItem>
                  <SelectItem value="active">Nur aktive Mitglieder</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}

        {needsDateRange && (
          <>
            <Field className="w-40">
              <FieldLabel htmlFor={`reportDateFrom-${kind}`}>Von</FieldLabel>
              <Input id={`reportDateFrom-${kind}`} type="date" value={dateFrom.value} onChange={(e) => (dateFrom.value = e.target.value)} />
            </Field>
            <Field className="w-40">
              <FieldLabel htmlFor={`reportDateTo-${kind}`}>Bis</FieldLabel>
              <Input id={`reportDateTo-${kind}`} type="date" value={dateTo.value} onChange={(e) => (dateTo.value = e.target.value)} />
            </Field>
          </>
        )}

        <Field className="w-56">
          <FieldLabel htmlFor={`reportFacility-${kind}`}>Garagenanlage</FieldLabel>
          <Select value={facilityId.value} onValueChange={(value) => (facilityId.value = value ?? ALL_FACILITIES)}>
            <SelectTrigger id={`reportFacility-${kind}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_FACILITIES}>Alle Garagenanlagen</SelectItem>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {kind === 'invoice-run' && (
          <Field className="w-48">
            <FieldLabel htmlFor="reportType">Rechnungstyp</FieldLabel>
            <Select value={type.value} onValueChange={(value) => (type.value = value ?? ALL_TYPES)}>
              <SelectTrigger id="reportType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
      </FieldGroup>

      <div>
        <Button type="button" onClick={handleExport}>
          <FilePdfIcon data-icon="inline-start" />
          Als PDF exportieren
        </Button>
      </div>
    </div>
  );
}
