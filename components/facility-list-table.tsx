'use client';

import Link from 'next/link';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusIcon, EyeIcon } from '@phosphor-icons/react';

type FacilityRow = {
  id: string;
  name: string;
  city: string | null;
};

export function FacilityListTable({ items }: { items: FacilityRow[] }) {
  useSignals();
  const search = useSignal('');

  const filtered = items.filter((item) => {
    const term = search.value.trim().toLowerCase();
    if (!term) return true;
    return item.name.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Garagenanlage suchen…"
          className="max-w-xs"
          value={search.value}
          onChange={(e) => (search.value = e.target.value)}
        />
        <Link href="/garagenanlagen/neu">
          <Button size="sm">
            <PlusIcon data-icon="inline-start" />
            Neue Garagenanlage
          </Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Ort</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Keine Garagenanlagen gefunden.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.city ?? '–'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/garagenanlagen/${item.id}`}>
                    <Button size="icon-sm" variant="ghost">
                      <EyeIcon />
                      <span className="sr-only">Ansehen</span>
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
