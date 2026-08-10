import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GarageForm } from '@/components/garage-form';
import { neighborOptionsFor } from '@/lib/garage-derived';

export default async function NeueGaragePage({ searchParams }: { searchParams: Promise<{ facilityId?: string }> }) {
  const { facilityId } = await searchParams;
  if (!facilityId) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const facility = await db.orm.public.Facility.where({ id: facilityId, organizationId }).first();
  if (!facility) notFound();

  const canCreate = await auth.api
    .hasPermission({ headers: await headers(), body: { organizationId, permissions: { garage: ['create'] } } })
    .then((result) => result.success);
  if (!canCreate) notFound();

  const [constructionSections, blocks, garages] = await Promise.all([
    db.orm.public.ConstructionSection.where({ facilityId, organizationId }).all(),
    db.orm.public.Block.where({ facilityId, organizationId }).all(),
    db.orm.public.Garage.where({ facilityId, organizationId }).all(),
  ]);

  const sectionOptions = constructionSections.map((section) => ({ id: section.id, name: section.name }));
  const blockOptions = blocks.map((block) => ({
    id: block.id,
    name: block.name,
    constructionSectionId: block.constructionSectionId,
  }));

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Garage anlegen</CardTitle>
        <CardDescription>Neue Garage für {facility.name} erfassen.</CardDescription>
      </CardHeader>
      <CardContent>
        <GarageForm
          mode="create"
          facilityId={facility.id}
          constructionSections={sectionOptions}
          blocks={blockOptions}
          neighborOptions={neighborOptionsFor(garages, null)}
        />
      </CardContent>
    </Card>
  );
}
