'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createGarage as createGarageAction,
  updateGarage as updateGarageAction,
  deleteGarage as deleteGarageAction,
} from '@/app/(app)/_actions/garages';
import { createGarageSchema } from '@/lib/validation/garage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

type Garage = {
  id: string;
  number: string;
  shortName: string | null;
  type: 'single' | 'double';
  meterNumber: string | null;
  constructionSectionId: string | null;
  blockId: string | null;
  neighborGarageId: string | null;
};

type Option = { id: string; name: string };

type BlockOption = { id: string; name: string; constructionSectionId: string | null };

type NeighborOption = { id: string; number: string };

type FormValues = {
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

const typeLabels: Record<'single' | 'double', string> = { single: 'Einzelgarage', double: 'Doppelgarage' };

function GarageFormDialog({
  trigger,
  title,
  initialValues,
  constructionSections,
  blocks,
  neighborOptions,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initialValues: FormValues;
  constructionSections: Option[];
  blocks: BlockOption[];
  neighborOptions: NeighborOption[];
  onSubmit: (values: FormValues) => Promise<boolean>;
}) {
  useSignals();
  const open = useSignal(false);
  const values = useSignal<FormValues>(initialValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // createGarageSchema uses .refine(), which zod doesn't allow .omit() on;
    // facilityId isn't user-editable here (fixed by page context), so a
    // placeholder is enough for client-side validation — the server action
    // re-validates with the real facilityId.
    const result = createGarageSchema.safeParse({ facilityId: 'client-side-validation', ...toPayload(values.value) });
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;
    const ok = await onSubmit(values.value);
    isSubmitting.value = false;

    if (ok) {
      open.value = false;
      values.value = emptyForm();
    }
  }

  const availableBlocks = values.value.constructionSectionId
    ? blocks.filter((block) => block.constructionSectionId === values.value.constructionSectionId)
    : blocks.filter((block) => !block.constructionSectionId);

  const sectionNameById = new Map(constructionSections.map((section) => [section.id, section.name]));
  const blockNameById = new Map(blocks.map((block) => [block.id, block.name]));
  const neighborNumberById = new Map(neighborOptions.map((neighbor) => [neighbor.id, neighbor.number]));

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

export function GarageManager({
  facilityId,
  initialItems,
  constructionSections,
  blocks,
  canEdit,
}: {
  facilityId: string;
  initialItems: Garage[];
  constructionSections: Option[];
  blocks: BlockOption[];
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();
  const sectionNameById = new Map(constructionSections.map((section) => [section.id, section.name]));
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const garageById = new Map(initialItems.map((garage) => [garage.id, garage]));

  // A garage already paired up (either as the one holding the
  // neighborGarageId, or as the target another garage points at) isn't
  // offered as a neighbor candidate for a *different* garage — the DB's
  // unique constraint would reject it anyway.
  const pairedGarageIds = new Set<string>();
  for (const garage of initialItems) {
    if (garage.neighborGarageId) {
      pairedGarageIds.add(garage.id);
      pairedGarageIds.add(garage.neighborGarageId);
    }
  }

  function neighborOptionsFor(item: Garage | null): NeighborOption[] {
    return initialItems
      .filter(
        (garage) =>
          garage.type === 'double' &&
          garage.id !== item?.id &&
          (!pairedGarageIds.has(garage.id) || garage.id === item?.neighborGarageId),
      )
      .map((garage) => ({ id: garage.id, number: garage.number }));
  }

  function sectionLabel(item: Garage): string {
    const sectionId = item.constructionSectionId ?? (item.blockId ? blockById.get(item.blockId)?.constructionSectionId : null);
    return sectionId ? (sectionNameById.get(sectionId) ?? '–') : '–';
  }

  function blockLabel(item: Garage): string {
    return item.blockId ? (blockById.get(item.blockId)?.name ?? '–') : '–';
  }

  function neighborLabel(item: Garage): string | null {
    if (!item.neighborGarageId) return null;
    return garageById.get(item.neighborGarageId)?.number ?? '–';
  }

  async function createGarage(values: FormValues): Promise<boolean> {
    const result = await createGarageAction({
      facilityId,
      number: values.number,
      shortName: values.shortName || undefined,
      type: values.type,
      meterNumber: values.meterNumber || undefined,
      constructionSectionId: values.blockId ? undefined : values.constructionSectionId,
      blockId: values.blockId,
      neighborGarageId: values.type === 'double' ? (values.neighborGarageId ?? null) : null,
    });
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Garage angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateGarage(id: string, values: FormValues): Promise<boolean> {
    const result = await updateGarageAction(id, {
      number: values.number,
      shortName: values.shortName || undefined,
      type: values.type,
      meterNumber: values.meterNumber || undefined,
      constructionSectionId: values.blockId ? undefined : values.constructionSectionId,
      blockId: values.blockId,
      neighborGarageId: values.type === 'double' ? (values.neighborGarageId ?? null) : null,
    });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Garage aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteGarage(id: string) {
    const result = await deleteGarageAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Garage gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <GarageFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Neue Garage
              </Button>
            }
            title="Garage anlegen"
            initialValues={emptyForm()}
            constructionSections={constructionSections}
            blocks={blocks}
            neighborOptions={neighborOptionsFor(null)}
            onSubmit={createGarage}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nummer</TableHead>
            <TableHead>Kurzbezeichnung</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Zählernummer</TableHead>
            <TableHead>Bauabschnitt</TableHead>
            <TableHead>Trakt</TableHead>
            <TableHead>Nachbargarage</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground">
                Noch keine Garagen erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.number}</TableCell>
              <TableCell>{item.shortName ?? '–'}</TableCell>
              <TableCell>{typeLabels[item.type]}</TableCell>
              <TableCell>{item.meterNumber ?? '–'}</TableCell>
              <TableCell>{sectionLabel(item)}</TableCell>
              <TableCell>{blockLabel(item)}</TableCell>
              <TableCell>
                {item.type === 'double' ? (
                  neighborLabel(item) ?? <Badge variant="destructive">Nachbar fehlt</Badge>
                ) : (
                  '–'
                )}
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <GarageFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Garage bearbeiten"
                      initialValues={{
                        number: item.number,
                        shortName: item.shortName ?? '',
                        type: item.type,
                        meterNumber: item.meterNumber ?? '',
                        constructionSectionId:
                          item.constructionSectionId ??
                          (item.blockId ? (blockById.get(item.blockId)?.constructionSectionId ?? undefined) : undefined),
                        blockId: item.blockId ?? undefined,
                        neighborGarageId: item.neighborGarageId ?? undefined,
                      }}
                      constructionSections={constructionSections}
                      blocks={blocks}
                      neighborOptions={neighborOptionsFor(item)}
                      onSubmit={(values) => updateGarage(item.id, values)}
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
                          <AlertDialogTitle>Garage löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteGarage(item.id)}>Löschen</AlertDialogAction>
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
