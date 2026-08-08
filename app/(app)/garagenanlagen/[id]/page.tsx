import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FacilityProfileEditor } from '@/components/facility-profile-editor';
import { ConstructionSectionManager } from '@/components/construction-section-manager';
import { BlockManager } from '@/components/block-manager';
import { GarageManager } from '@/components/garage-manager';

export default async function GaragenanlageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const facility = await db.orm.public.Facility.where({ id, organizationId }).first();
  if (!facility) notFound();

  const [constructionSections, blocks, garages, canEdit] = await Promise.all([
    db.orm.public.ConstructionSection.where({ facilityId: id, organizationId }).all(),
    db.orm.public.Block.where({ facilityId: id, organizationId }).all(),
    db.orm.public.Garage.where({ facilityId: id, organizationId }).all(),
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
    <Tabs defaultValue="stammdaten">
      <TabsList>
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="bauabschnitte">Bauabschnitte</TabsTrigger>
        <TabsTrigger value="trakte">Trakte</TabsTrigger>
        <TabsTrigger value="garagen">Garagen</TabsTrigger>
      </TabsList>

      <TabsContent value="stammdaten">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>{facility.name}</CardTitle>
              <CardDescription>Stammdaten der Garagenanlage.</CardDescription>
            </div>
            {canEdit && (
              <FacilityProfileEditor
                facilityId={facility.id}
                initialValues={{
                  name: facility.name,
                  street: facility.street ?? '',
                  houseNumber: facility.houseNumber ?? '',
                  postalCode: facility.postalCode ?? '',
                  city: facility.city ?? '',
                }}
              />
            )}
          </CardHeader>
        </Card>
      </TabsContent>

      <TabsContent value="bauabschnitte">
        <Card>
          <CardHeader>
            <CardTitle>Bauabschnitte</CardTitle>
          </CardHeader>
          <CardContent>
            <ConstructionSectionManager facilityId={facility.id} initialItems={sectionOptions} canEdit={canEdit} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trakte">
        <Card>
          <CardHeader>
            <CardTitle>Trakte</CardTitle>
          </CardHeader>
          <CardContent>
            <BlockManager
              facilityId={facility.id}
              initialItems={blocks.map((block) => ({
                id: block.id,
                name: block.name,
                constructionSectionId: block.constructionSectionId,
              }))}
              constructionSections={sectionOptions}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="garagen">
        <Card>
          <CardHeader>
            <CardTitle>Garagen</CardTitle>
          </CardHeader>
          <CardContent>
            <GarageManager
              facilityId={facility.id}
              initialItems={garages.map((garage) => ({
                id: garage.id,
                number: garage.number,
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
      </TabsContent>
    </Tabs>
  );
}
