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
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@/components/ui/autocomplete';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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

const PAGE_SIZE = 10;

type FilterKey = 'number' | 'shortName' | 'type' | 'meterNumber' | 'section' | 'block' | 'neighbor';

const emptyFilters: Record<FilterKey, string> = {
  number: '',
  shortName: '',
  type: '',
  meterNumber: '',
  section: '',
  block: '',
  neighbor: '',
};

function distinctValues(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value !== ''))).sort((a, b) => a.localeCompare(b, 'de'));
}

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  const items: (number | 'ellipsis')[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) items.push('ellipsis');
  for (let page = from; page <= to; page++) items.push(page);
  if (to < total - 1) items.push('ellipsis');
  if (total > 1) items.push(total);
  return items;
}

function ColumnFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Autocomplete
      items={options}
      value={value}
      onValueChange={onChange}
      filter={(itemValue: string, query: string) => itemValue.toLowerCase().includes(query.trim().toLowerCase())}
    >
      <AutocompleteInput placeholder="Filtern…" className="h-8 w-full" />
      <AutocompleteContent>
        <AutocompleteEmpty>Keine Treffer</AutocompleteEmpty>
        <AutocompleteList>
          {(item: string) => <AutocompleteItem key={item} value={item}>{item}</AutocompleteItem>}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}

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
  const filters = useSignal<Record<FilterKey, string>>(emptyFilters);
  const page = useSignal(1);
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

  function setFilter(key: FilterKey, value: string) {
    filters.value = { ...filters.value, [key]: value };
    page.value = 1;
  }

  const rows = initialItems.map((item) => ({
    item,
    number: item.number,
    shortName: item.shortName ?? '',
    type: typeLabels[item.type],
    meterNumber: item.meterNumber ?? '',
    section: sectionLabel(item),
    block: blockLabel(item),
    neighbor: item.type === 'double' ? (neighborLabel(item) ?? 'Nachbar fehlt') : '',
  }));

  const filterOptions: Record<FilterKey, string[]> = {
    number: distinctValues(rows.map((row) => row.number)),
    shortName: distinctValues(rows.map((row) => row.shortName)),
    type: distinctValues(rows.map((row) => row.type)),
    meterNumber: distinctValues(rows.map((row) => row.meterNumber)),
    section: distinctValues(rows.map((row) => row.section)),
    block: distinctValues(rows.map((row) => row.block)),
    neighbor: distinctValues(rows.map((row) => row.neighbor)),
  };

  const filteredRows = rows.filter((row) =>
    (Object.keys(filters.value) as FilterKey[]).every((key) => {
      const term = filters.value[key].trim().toLowerCase();
      return !term || row[key].toLowerCase().includes(term);
    }),
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page.value, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters = Object.values(filters.value).some((value) => value.trim() !== '');

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
      <div className="flex items-center justify-between gap-4">
        {hasActiveFilters ? (
          <Button size="sm" variant="outline" onClick={() => (filters.value = emptyFilters)}>
            Filter zurücksetzen
          </Button>
        ) : (
          <div />
        )}
        {canEdit && (
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
        )}
      </div>
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
          <TableRow>
            <TableHead>
              <ColumnFilter
                value={filters.value.number}
                options={filterOptions.number}
                onChange={(value) => setFilter('number', value)}
              />
            </TableHead>
            <TableHead>
              <ColumnFilter
                value={filters.value.shortName}
                options={filterOptions.shortName}
                onChange={(value) => setFilter('shortName', value)}
              />
            </TableHead>
            <TableHead>
              <ColumnFilter
                value={filters.value.type}
                options={filterOptions.type}
                onChange={(value) => setFilter('type', value)}
              />
            </TableHead>
            <TableHead>
              <ColumnFilter
                value={filters.value.meterNumber}
                options={filterOptions.meterNumber}
                onChange={(value) => setFilter('meterNumber', value)}
              />
            </TableHead>
            <TableHead>
              <ColumnFilter
                value={filters.value.section}
                options={filterOptions.section}
                onChange={(value) => setFilter('section', value)}
              />
            </TableHead>
            <TableHead>
              <ColumnFilter
                value={filters.value.block}
                options={filterOptions.block}
                onChange={(value) => setFilter('block', value)}
              />
            </TableHead>
            <TableHead>
              <ColumnFilter
                value={filters.value.neighbor}
                options={filterOptions.neighbor}
                onChange={(value) => setFilter('neighbor', value)}
              />
            </TableHead>
            {canEdit && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground">
                {initialItems.length === 0 ? 'Noch keine Garagen erfasst.' : 'Keine Garagen entsprechen den Filtern.'}
              </TableCell>
            </TableRow>
          )}
          {pageRows.map(({ item, shortName, type, meterNumber, section, block }) => (
            <TableRow key={item.id}>
              <TableCell>{item.number}</TableCell>
              <TableCell>{shortName || '–'}</TableCell>
              <TableCell>{type}</TableCell>
              <TableCell>{meterNumber || '–'}</TableCell>
              <TableCell>{section}</TableCell>
              <TableCell>{block}</TableCell>
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
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) page.value = currentPage - 1;
                }}
              />
            </PaginationItem>
            {pageWindow(currentPage, totalPages).map((entry, index) =>
              entry === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      page.value = entry;
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) page.value = currentPage + 1;
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
