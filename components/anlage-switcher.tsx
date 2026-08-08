'use client';

import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Stage 1 stub: no Garagenanlage rows exist yet (Stage 2 introduces the
// model's CRUD). Selection will be persisted to a `selected-anlage` cookie,
// read server-side by `app/(app)/layout.tsx` and descendants, once real
// Anlagen exist to select from.
export function AnlageSwitcher() {
  // Manual opt-in tracking: no signals babel/swc transform is configured,
  // so components must subscribe themselves to re-render on `.value` reads.
  useSignals();
  const selectedAnlageId = useSignal<string | undefined>(undefined);

  return (
    <Select
      disabled
      value={selectedAnlageId.value}
      onValueChange={(value) => (selectedAnlageId.value = value ?? undefined)}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Keine Garagenanlage" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="none" disabled>
            Noch keine Garagenanlage angelegt
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
