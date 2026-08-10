import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GarageForm } from '@/components/garage-form';
import { neighborOptionsFor, sectionIdForGarage } from '@/lib/garage-derived';

export default async function GarageBearbeitenPage({ params }: { params: Promise<{ garageId: string }> }) {
  const { garageId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const garage = await db.orm.public.Garage.where({ id: garageId, organizationId }).first();
  if (!garage) notFound();

  const canUpdate = await auth.api
    .hasPermission({ headers: await headers(), body: { organizationId, permissions: { garage: ['update'] } } })
    .then((result) => result.success);
  if (!canUpdate) notFound();

  const facility = await db.orm.public.Facility.where({ id: garage.facilityId, organizationId }).first();
  if (!facility) notFound();

  const [constructionSections, blocks, garages] = await Promise.all([
    db.orm.public.ConstructionSection.where({ facilityId: facility.id, organizationId }).all(),
    db.orm.public.Block.where({ facilityId: facility.id, organizationId }).all(),
    db.orm.public.Garage.where({ facilityId: facility.id, organizationId }).all(),
  ]);

  const sectionOptions = constructionSections.map((section) => ({ id: section.id, name: section.name }));
  const blockOptions = blocks.map((block) => ({
    id: block.id,
    name: block.name,
    constructionSectionId: block.constructionSectionId,
  }));
  const blockById = new Map(blocks.map((block) => [block.id, block]));

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Garage bearbeiten</CardTitle>
        <CardDescription>
          Garage {garage.number} von {facility.name} bearbeiten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GarageForm
          mode="edit"
          garageId={garage.id}
          facilityId={facility.id}
          initialValues={{
            number: garage.number,
            shortName: garage.shortName ?? '',
            type: garage.type,
            meterNumber: garage.meterNumber ?? '',
            constructionSectionId: sectionIdForGarage(garage, blockById) ?? undefined,
            blockId: garage.blockId ?? undefined,
            neighborGarageId: garage.neighborGarageId ?? undefined,
          }}
          constructionSections={sectionOptions}
          blocks={blockOptions}
          neighborOptions={neighborOptionsFor(garages, garage)}
        />
      </CardContent>
    </Card>
  );
}
