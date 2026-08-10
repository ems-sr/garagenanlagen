// Money fields in this stage are stored as Int cents — format for display
// only here, never round/parse cents ad hoc at call sites.
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
