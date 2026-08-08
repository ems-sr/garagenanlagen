'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { selectFacility } from '@/app/(app)/_actions/select-facility';

type Facility = { id: string; name: string };

export function FacilitySwitcher({
  facilities,
  selectedFacilityId,
}: {
  facilities: Facility[];
  selectedFacilityId: string | undefined;
}) {
  // Manual opt-in tracking: no signals babel/swc transform is configured,
  // so components must subscribe themselves to re-render on `.value` reads.
  useSignals();
  const router = useRouter();
  // Always a defined string ('' meaning "none selected") so the Select's
  // value prop never switches between undefined and defined across
  // renders — Base UI (like React) decides controlled-vs-uncontrolled from
  // the first render and warns on a later transition.
  const selected = useSignal<string>(selectedFacilityId ?? '');

  if (facilities.length === 0) {
    return (
      <Select value="" disabled>
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

  return (
    <Select
      value={selected.value}
      onValueChange={async (value) => {
        selected.value = value ?? '';
        if (value) {
          await selectFacility(value);
          router.refresh();
        }
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Garagenanlage wählen">
          {(value: string) => facilities.find((facility) => facility.id === value)?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {facilities.map((facility) => (
            <SelectItem key={facility.id} value={facility.id}>
              {facility.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
