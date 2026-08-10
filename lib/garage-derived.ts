export type DerivedGarage = {
  id: string;
  type: 'single' | 'double';
  neighborGarageId: string | null;
};

export type NeighborOption = { id: string; number: string };

export function pairedGarageIds(garages: DerivedGarage[]): Set<string> {
  const paired = new Set<string>();
  for (const garage of garages) {
    if (garage.neighborGarageId) {
      paired.add(garage.id);
      paired.add(garage.neighborGarageId);
    }
  }
  return paired;
}

// A garage already paired up (either as the one holding the
// neighborGarageId, or as the target another garage points at) isn't
// offered as a neighbor candidate for a *different* garage — the DB's
// unique constraint would reject it anyway.
export function neighborOptionsFor<G extends DerivedGarage & { number: string }>(
  garages: G[],
  item: (DerivedGarage & { number: string }) | null,
): NeighborOption[] {
  const paired = pairedGarageIds(garages);
  return garages
    .filter(
      (garage) =>
        garage.type === 'double' &&
        garage.id !== item?.id &&
        (!paired.has(garage.id) || garage.id === item?.neighborGarageId),
    )
    .map((garage) => ({ id: garage.id, number: garage.number }));
}

export function sectionIdForGarage(
  garage: { constructionSectionId: string | null; blockId: string | null },
  blockById: Map<string, { constructionSectionId: string | null }>,
): string | null {
  return garage.constructionSectionId ?? (garage.blockId ? (blockById.get(garage.blockId)?.constructionSectionId ?? null) : null);
}
