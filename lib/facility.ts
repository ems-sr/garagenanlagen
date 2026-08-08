import { cookies } from 'next/headers';

export const SELECTED_FACILITY_COOKIE = 'selected-facility';

// This cookie is a UI convenience, not an authorization boundary — every API
// route independently re-derives organizationId from the session and
// validates facilityId ownership server-side, regardless of what's
// "selected" here. httpOnly is deliberately false: it's not a credential,
// and the client-side switcher needs to read it too for initial hydration.
export async function getSelectedFacilityId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SELECTED_FACILITY_COOKIE)?.value;
}

export async function setSelectedFacilityId(id: string): Promise<void> {
  const store = await cookies();
  store.set(SELECTED_FACILITY_COOKIE, id, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
