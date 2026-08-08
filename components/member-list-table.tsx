'use client';

import Link from 'next/link';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusIcon, EyeIcon, PencilSimpleIcon } from '@phosphor-icons/react';

type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  city: string | null;
  active: boolean;
};

export function MemberListTable({ items }: { items: MemberRow[] }) {
  useSignals();
  const search = useSignal('');

  const filtered = items.filter((item) => {
    const term = search.value.trim().toLowerCase();
    if (!term) return true;
    return `${item.firstName} ${item.lastName}`.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Mitglied suchen…"
          className="max-w-xs"
          value={search.value}
          onChange={(e) => (search.value = e.target.value)}
        />
        <Link href="/mitglieder/neu">
          <Button size="sm">
            <PlusIcon data-icon="inline-start" />
            Neues Mitglied
          </Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Ort</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Keine Mitglieder gefunden.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.firstName} {item.lastName}
              </TableCell>
              <TableCell>{item.city ?? '–'}</TableCell>
              <TableCell>
                <Badge variant={item.active ? 'default' : 'secondary'}>{item.active ? 'Aktiv' : 'Inaktiv'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/mitglieder/${item.id}`}>
                    <Button size="icon-sm" variant="ghost">
                      <EyeIcon />
                      <span className="sr-only">Ansehen</span>
                    </Button>
                  </Link>
                  <Link href={`/mitglieder/${item.id}/bearbeiten`}>
                    <Button size="icon-sm" variant="ghost">
                      <PencilSimpleIcon />
                      <span className="sr-only">Bearbeiten</span>
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
