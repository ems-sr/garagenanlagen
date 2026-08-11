import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GarageForm } from '@/components/garage-form';
import { MeterReadingManager } from '@/components/meter-reading-manager';
import { GarageAttributeAssignmentManager } from '@/components/garage-attribute-assignment-manager';
import { GarageUsageHistory } from '@/components/garage-usage-history';
import { neighborOptionsFor, sectionIdForGarage } from '@/lib/garage-derived';

const TABS = ['stammdaten', 'zaehlerstaende', 'attribute', 'verlauf'] as const;

export default async function GaragePage({
  params,
  searchParams,
}: {
  params: Promise<{ garageId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { garageId } = await params;
  const { tab } = await searchParams;
  const initialTab = (TABS as readonly string[]).includes(tab ?? '') ? (tab as (typeof TABS)[number]) : 'stammdaten';
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

  const [
    constructionSections,
    blocks,
    garages,
    readings,
    attributeTypes,
    attributeAssignments,
    usageEvents,
    canEditReadings,
    canInvoice,
    canEditAttributes,
    canAddUsageNote,
  ] = await Promise.all([
    db.orm.public.ConstructionSection.where({ facilityId: facility.id, organizationId }).all(),
    db.orm.public.Block.where({ facilityId: facility.id, organizationId }).all(),
    db.orm.public.Garage.where({ facilityId: facility.id, organizationId }).all(),
    db.orm.public.MeterReading.where({ garageId: garage.id, organizationId }).orderBy((r) => r.readingDate.desc()).all(),
    db.orm.public.GarageAttributeType.where({ organizationId }).orderBy((t) => t.name.asc()).all(),
    db.orm.public.GarageAttributeAssignment.where({ garageId: garage.id, organizationId }).all(),
    db.orm.public.GarageUsageEvent.where({ garageId: garage.id, organizationId }).orderBy((e) => e.occurredAt.desc()).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { meterReading: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { invoice: ['create'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { garageAttribute: ['create'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { garageUsageEvent: ['create'] } } })
      .then((result) => result.success),
  ]);

  const sectionOptions = constructionSections.map((section) => ({ id: section.id, name: section.name }));
  const blockOptions = blocks.map((block) => ({
    id: block.id,
    name: block.name,
    constructionSectionId: block.constructionSectionId,
  }));
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const attributeValues = Object.fromEntries(attributeAssignments.map((a) => [a.attributeTypeId, a.value]));

  return (
    <Tabs defaultValue={initialTab}>
      <TabsList>
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="zaehlerstaende">Zählerstände</TabsTrigger>
        <TabsTrigger value="attribute">Attribute</TabsTrigger>
        <TabsTrigger value="verlauf">Nutzungsverlauf</TabsTrigger>
      </TabsList>

      <TabsContent value="stammdaten">
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
      </TabsContent>

      <TabsContent value="zaehlerstaende">
        <Card>
          <CardHeader>
            <CardTitle>Zählerstände</CardTitle>
            <CardDescription>
              Ablesungen für Garage {garage.number}. Die Rechnung wird für den Verbrauch seit der letzten
              Abrechnung bis zum letzten erfassten Zählerstand erzeugt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MeterReadingManager
              garageId={garage.id}
              initialItems={readings.map((reading) => ({
                id: reading.id,
                readingDate: reading.readingDate.toISOString(),
                value: reading.value,
                note: reading.note,
                invoiced: reading.invoiceId != null,
              }))}
              canEdit={canEditReadings}
              canInvoice={canInvoice}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="attribute">
        <Card>
          <CardHeader>
            <CardTitle>Attribute</CardTitle>
            <CardDescription>Ausstattungsmerkmale von Garage {garage.number}.</CardDescription>
          </CardHeader>
          <CardContent>
            <GarageAttributeAssignmentManager
              garageId={garage.id}
              attributeTypes={attributeTypes.map((t) => ({ id: t.id, name: t.name, dataType: t.dataType, unit: t.unit }))}
              values={attributeValues}
              canEdit={canEditAttributes}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="verlauf">
        <Card>
          <CardHeader>
            <CardTitle>Nutzungsverlauf</CardTitle>
            <CardDescription>Verlauf der Zuordnungen und Notizen für Garage {garage.number}.</CardDescription>
          </CardHeader>
          <CardContent>
            <GarageUsageHistory
              garageId={garage.id}
              initialItems={usageEvents.map((event) => ({
                id: event.id,
                eventType: event.eventType,
                description: event.description,
                occurredAt: event.occurredAt.toISOString(),
              }))}
              canCreate={canAddUsageNote}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
