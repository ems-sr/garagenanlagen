import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FacilityListTable } from '@/components/facility-list-table';

export default async function GaragenanlagenPage() {
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

  const facilities = await db.orm.public.Facility.where({ organizationId }).all();

  const items = facilities.map((facility) => ({
    id: facility.id,
    name: facility.name,
    city: facility.city,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Garagenanlagen</CardTitle>
        <CardDescription>Garagenanlagen, Bauabschnitte, Trakte und Garagen verwalten.</CardDescription>
      </CardHeader>
      <CardContent>
        <FacilityListTable items={items} />
      </CardContent>
    </Card>
  );
}
