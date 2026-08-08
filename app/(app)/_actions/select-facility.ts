'use server';

import { setSelectedFacilityId } from '@/lib/facility';

export async function selectFacility(facilityId: string): Promise<void> {
  await setSelectedFacilityId(facilityId);
}
