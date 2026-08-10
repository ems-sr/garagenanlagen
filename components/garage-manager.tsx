'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { deleteGarage as deleteGarageAction } from '@/app/(app)/_actions/garages';
import { typeLabels } from '@/components/garage-form';
import { sectionIdForGarage } from '@/lib/garage-derived';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@/components/ui/autocomplete';
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

  function sectionLabel(item: Garage): string {
    const sectionId = sectionIdForGarage(item, blockById);
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
          <Link href={`/garagen/neu?facilityId=${facilityId}`}>
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              Neue Garage
            </Button>
          </Link>
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
                    <Link href={`/garagen/${item.id}`}>
                      <Button size="icon-sm" variant="ghost">
                        <PencilSimpleIcon />
                        <span className="sr-only">Bearbeiten</span>
                      </Button>
                    </Link>
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
