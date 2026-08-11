'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { saveAttributeAssignment, removeAttributeAssignment } from '@/app/(app)/_actions/garage-attributes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { DATA_TYPE_LABELS, type GarageAttributeDataType } from '@/components/garage-attribute-type-manager';

type AttributeTypeOption = { id: string; name: string; dataType: GarageAttributeDataType; unit: string | null };

function AttributeRow({
  garageId,
  attributeType,
  initialValue,
  canEdit,
}: {
  garageId: string;
  attributeType: AttributeTypeOption;
  initialValue: string | null;
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();
  const value = useSignal(initialValue ?? (attributeType.dataType === 'boolean' ? 'false' : ''));
  const isSaving = useSignal(false);

  async function handleSave() {
    isSaving.value = true;
    const result = await saveAttributeAssignment(garageId, { attributeTypeId: attributeType.id, value: value.value });
    isSaving.value = false;

    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Wert gespeichert', type: 'success' });
    router.refresh();
  }

  async function handleClear() {
    isSaving.value = true;
    const result = await removeAttributeAssignment(garageId, attributeType.id);
    isSaving.value = false;

    if (!result.success) {
      toast.add({ title: 'Entfernen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Wert entfernt', type: 'success' });
    value.value = attributeType.dataType === 'boolean' ? 'false' : '';
    router.refresh();
  }

  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor={`attr-${attributeType.id}`}>
        {attributeType.name}
        {attributeType.unit ? ` (${attributeType.unit})` : ''}
      </FieldLabel>
      <div className="flex gap-2">
        {attributeType.dataType === 'boolean' ? (
          <Select value={value.value} onValueChange={(v) => (value.value = v ?? 'false')} disabled={!canEdit}>
            <SelectTrigger id={`attr-${attributeType.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="true">Ja</SelectItem>
                <SelectItem value="false">Nein</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={`attr-${attributeType.id}`}
            type={attributeType.dataType === 'number' ? 'number' : 'text'}
            value={value.value}
            onChange={(e) => (value.value = e.target.value)}
            disabled={!canEdit}
          />
        )}
        {canEdit && (
          <>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={isSaving.value || value.value === ''}>
              Speichern
            </Button>
            {initialValue != null && (
              <Button size="sm" variant="ghost" onClick={handleClear} disabled={isSaving.value}>
                Entfernen
              </Button>
            )}
          </>
        )}
      </div>
    </Field>
  );
}

export function GarageAttributeAssignmentManager({
  garageId,
  attributeTypes,
  values,
  canEdit,
}: {
  garageId: string;
  attributeTypes: AttributeTypeOption[];
  values: Record<string, string>;
  canEdit: boolean;
}) {
  if (attributeTypes.length === 0) {
    return <p className="text-muted-foreground">Noch kein Attributtyp im Verein hinterlegt.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {attributeTypes.map((attributeType) => (
        <div key={attributeType.id} className="flex items-baseline gap-3">
          <AttributeRow
            garageId={garageId}
            attributeType={attributeType}
            initialValue={values[attributeType.id] ?? null}
            canEdit={canEdit}
          />
          <span className="text-xs text-muted-foreground">{DATA_TYPE_LABELS[attributeType.dataType]}</span>
        </div>
      ))}
    </div>
  );
}
