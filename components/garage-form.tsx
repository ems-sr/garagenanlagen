'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createGarage as createGarageAction,
  updateGarage as updateGarageAction,
} from '@/app/(app)/_actions/garages';
import { createGarageSchema, updateGarageSchema } from '@/lib/validation/garage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

export type Option = { id: string; name: string };

export type BlockOption = { id: string; name: string; constructionSectionId: string | null };

export type NeighborOption = { id: string; number: string };

export type FormValues = {
  number: string;
  shortName: string;
  type: 'single' | 'double';
  meterNumber: string;
  constructionSectionId: string | undefined;
  blockId: string | undefined;
  neighborGarageId: string | undefined;
};

function emptyForm(): FormValues {
  return {
    number: '',
    shortName: '',
    type: 'single',
    meterNumber: '',
    constructionSectionId: undefined,
    blockId: undefined,
    neighborGarageId: undefined,
  };
}

const NONE = '__none__';

export const typeLabels: Record<'single' | 'double', string> = { single: 'Einzelgarage', double: 'Doppelgarage' };

type GarageFormProps = {
  facilityId: string;
  constructionSections: Option[];
  blocks: BlockOption[];
  neighborOptions: NeighborOption[];
} & (
  | { mode: 'create' }
  | { mode: 'edit'; garageId: string; initialValues: FormValues }
);

function toPayload(v: FormValues) {
  return {
    number: v.number,
    shortName: v.shortName === '' ? undefined : v.shortName,
    type: v.type,
    meterNumber: v.meterNumber === '' ? undefined : v.meterNumber,
    constructionSectionId: v.blockId ? undefined : v.constructionSectionId,
    blockId: v.blockId,
    // Explicit null (not undefined) so the server treats "no neighbor
    // selected" as a real clear-the-pairing instruction and propagates it
    // to the other side, rather than "field left untouched".
    neighborGarageId: v.type === 'double' ? (v.neighborGarageId ?? null) : null,
  };
}

export function GarageForm(props: GarageFormProps) {
  useSignals();
  const router = useRouter();
  const { facilityId, constructionSections, blocks, neighborOptions } = props;
  const initialValues = props.mode === 'edit' ? props.initialValues : emptyForm();
  const values = useSignal<FormValues>(initialValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = toPayload(values.value);
    const schema = props.mode === 'create' ? createGarageSchema : updateGarageSchema;
    // createGarageSchema uses .refine(), which zod doesn't allow .omit() on;
    // facilityId isn't user-editable here (fixed by page context), so a
    // placeholder is enough for client-side validation — the server action
    // re-validates with the real facilityId.
    const result = schema.safeParse({ facilityId: 'client-side-validation', ...payload });
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const actionResult =
      props.mode === 'create'
        ? await createGarageAction({ facilityId, ...payload })
        : await updateGarageAction(props.garageId, payload);

    isSubmitting.value = false;

    if (!actionResult.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: actionResult.error.message, type: 'error' });
      return;
    }

    toast.add({ title: props.mode === 'create' ? 'Garage angelegt' : 'Garage aktualisiert', type: 'success' });
    router.push(`/garagenanlagen/${facilityId}?tab=garagen`);
    router.refresh();
  }

  const availableBlocks = values.value.constructionSectionId
    ? blocks.filter((block) => block.constructionSectionId === values.value.constructionSectionId)
    : blocks.filter((block) => !block.constructionSectionId);

  const sectionNameById = new Map(constructionSections.map((section) => [section.id, section.name]));
  const blockNameById = new Map(blocks.map((block) => [block.id, block.name]));
  const neighborNumberById = new Map(neighborOptions.map((neighbor) => [neighbor.id, neighbor.number]));

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.value.number}>
          <FieldLabel htmlFor="garageNumber">Garagennummer</FieldLabel>
          <Input
            id="garageNumber"
            value={values.value.number}
            onChange={(e) => (values.value = { ...values.value, number: e.target.value })}
            aria-invalid={!!errors.value.number}
          />
          {errors.value.number && <FieldError errors={[{ message: errors.value.number }]} />}
        </Field>
        <Field data-invalid={!!errors.value.shortName}>
          <FieldLabel htmlFor="garageShortName">Kurzbezeichnung</FieldLabel>
          <Input
            id="garageShortName"
            value={values.value.shortName}
            onChange={(e) => (values.value = { ...values.value, shortName: e.target.value })}
          />
          {errors.value.shortName && <FieldError errors={[{ message: errors.value.shortName }]} />}
        </Field>
        <Field>
          <FieldLabel htmlFor="garageType">Typ</FieldLabel>
          <Select
            value={values.value.type}
            onValueChange={(value) => (values.value = { ...values.value, type: value as 'single' | 'double' })}
          >
            <SelectTrigger id="garageType">
              <SelectValue>{(value: 'single' | 'double' | null) => (value ? typeLabels[value] : '')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="single">{typeLabels.single}</SelectItem>
                <SelectItem value="double">{typeLabels.double}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="garageMeter">Zählernummer</FieldLabel>
          <Input
            id="garageMeter"
            value={values.value.meterNumber}
            onChange={(e) => (values.value = { ...values.value, meterNumber: e.target.value })}
          />
        </Field>
        {values.value.type === 'double' && (
          <Field data-invalid={!!errors.value.neighborGarageId}>
            <FieldLabel htmlFor="garageNeighbor">Nachbargarage</FieldLabel>
            <Select
              value={values.value.neighborGarageId ?? NONE}
              onValueChange={(value) =>
                (values.value = { ...values.value, neighborGarageId: !value || value === NONE ? undefined : value })
              }
            >
              <SelectTrigger id="garageNeighbor">
                <SelectValue placeholder="Noch keine Nachbargarage">
                  {(value: string | null) =>
                    !value || value === NONE ? 'Noch keine Nachbargarage' : (neighborNumberById.get(value) ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NONE}>Noch keine Nachbargarage</SelectItem>
                  {neighborOptions.map((neighbor) => (
                    <SelectItem key={neighbor.id} value={neighbor.id}>
                      {neighbor.number}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.value.neighborGarageId && <FieldError errors={[{ message: errors.value.neighborGarageId }]} />}
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="garageSection">Bauabschnitt</FieldLabel>
          <Select
            value={values.value.constructionSectionId ?? NONE}
            onValueChange={(value) =>
              (values.value = {
                ...values.value,
                constructionSectionId: !value || value === NONE ? undefined : value,
                // The block list depends on the chosen section, so a
                // previously picked block from a different section is no
                // longer valid once the section changes.
                blockId: undefined,
              })
            }
          >
            <SelectTrigger id="garageSection">
              <SelectValue placeholder="Direkt der Garagenanlage zugeordnet">
                {(value: string | null) =>
                  !value || value === NONE ? 'Direkt der Garagenanlage zugeordnet' : (sectionNameById.get(value) ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NONE}>Direkt der Garagenanlage zugeordnet</SelectItem>
                {constructionSections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={!!errors.value.blockId}>
          <FieldLabel htmlFor="garageBlock">Trakt</FieldLabel>
          <Select
            value={values.value.blockId ?? NONE}
            onValueChange={(value) =>
              (values.value = { ...values.value, blockId: !value || value === NONE ? undefined : value })
            }
          >
            <SelectTrigger id="garageBlock">
              <SelectValue
                placeholder={values.value.constructionSectionId ? 'Diesem Bauabschnitt zugeordnet' : 'Kein Trakt'}
              >
                {(value: string | null) =>
                  !value || value === NONE
                    ? values.value.constructionSectionId
                      ? 'Diesem Bauabschnitt zugeordnet'
                      : 'Kein Trakt'
                    : (blockNameById.get(value) ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NONE}>
                  {values.value.constructionSectionId ? 'Diesem Bauabschnitt zugeordnet' : 'Kein Trakt'}
                </SelectItem>
                {availableBlocks.map((block) => (
                  <SelectItem key={block.id} value={block.id}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors.value.blockId && <FieldError errors={[{ message: errors.value.blockId }]} />}
        </Field>
        <Button type="submit" disabled={isSubmitting.value}>
          Speichern
        </Button>
      </FieldGroup>
    </form>
  );
}
