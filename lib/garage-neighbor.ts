import { db } from '@/prisma/db';

// Pairing is stored as a self-FK on each side, so assigning A -> B must also
// write B -> A for the two garages to agree on who their neighbor is. If B
// was already paired with a third garage C, C's side would otherwise keep
// pointing at B even though B now points elsewhere — unlink it first so both
// sides of the *new* pairing are consistent.
export async function linkNeighbor(
  tx: { orm: typeof db.orm },
  organizationId: string,
  garageId: string,
  neighborId: string,
): Promise<void> {
  const neighbor = await tx.orm.public.Garage.where({ id: neighborId, organizationId }).first();
  if (neighbor?.neighborGarageId && neighbor.neighborGarageId !== garageId) {
    await tx.orm.public.Garage.where({ id: neighbor.neighborGarageId, organizationId }).update({ neighborGarageId: null });
  }
  await tx.orm.public.Garage.where({ id: neighborId, organizationId }).update({ neighborGarageId: garageId });
}
