import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationList } from '@/components/organization-list';

// Covers the rare case of a user belonging to more than one Verein
// (Better Auth Organization) and needing to switch the active one.
export default async function OrganizationsPage() {
  const organizations = await auth.api.listOrganizations({ headers: await headers() });
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Verein wechseln</CardTitle>
        <CardDescription>Wählen Sie den Verein, mit dem Sie arbeiten möchten.</CardDescription>
      </CardHeader>
      <CardContent>
        <OrganizationList
          organizations={organizations ?? []}
          activeOrganizationId={session?.session.activeOrganizationId ?? undefined}
        />
      </CardContent>
    </Card>
  );
}
