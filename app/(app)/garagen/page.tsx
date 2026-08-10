import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { getSelectedFacilityId } from '@/lib/facility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FacilitySwitcher } from '@/components/facility-switcher';
import { GarageManager } from '@/components/garage-manager';

export default async function GaragenPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kein Verein ausgewählt</CardTitle>
          <CardDescription>Bitte wählen Sie zunächst einen Verein aus.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const facilityId = await getSelectedFacilityId();
  if (!facilityId) {
    const facilities = await db.orm.public.Facility.where({ organizationId }).all();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Garagenanlage ausgewählt</CardTitle>
          <CardDescription>Bitte wählen Sie zunächst eine Garagenanlage aus.</CardDescription>
        </CardHeader>
        <CardContent>
          <FacilitySwitcher
            facilities={facilities.map((facility) => ({ id: facility.id, name: facility.name }))}
            selectedFacilityId={undefined}
          />
        </CardContent>
      </Card>
    );
  }

  const [constructionSections, blocks, garages, canEdit] = await Promise.all([
    db.orm.public.ConstructionSection.where({ facilityId, organizationId }).all(),
    db.orm.public.Block.where({ facilityId, organizationId }).all(),
    db.orm.public.Garage.where({ facilityId, organizationId }).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { garage: ['update'] } } })
      .then((result) => result.success),
  ]);

  const sectionOptions = constructionSections.map((section) => ({ id: section.id, name: section.name }));
  const blockOptions = blocks.map((block) => ({
    id: block.id,
    name: block.name,
    constructionSectionId: block.constructionSectionId,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Garagen</CardTitle>
        <CardDescription>Garagen der ausgewählten Garagenanlage.</CardDescription>
      </CardHeader>
      <CardContent>
        <GarageManager
          facilityId={facilityId}
          initialItems={garages.map((garage) => ({
            id: garage.id,
            number: garage.number,
            shortName: garage.shortName,
            type: garage.type,
            meterNumber: garage.meterNumber,
            constructionSectionId: garage.constructionSectionId,
            blockId: garage.blockId,
            neighborGarageId: garage.neighborGarageId,
          }))}
          constructionSections={sectionOptions}
          blocks={blockOptions}
          canEdit={canEdit}
        />
      </CardContent>
    </Card>
  );
}
