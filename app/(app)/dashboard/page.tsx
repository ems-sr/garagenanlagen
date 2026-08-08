import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const activeOrg = session?.session.activeOrganizationId
    ? await auth.api.getFullOrganization({ headers: await headers() })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Willkommen, {session?.user.name}</CardTitle>
          <CardDescription>{session?.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeOrg ? (
            <p>
              Aktueller Verein: <strong>{activeOrg.name}</strong>
            </p>
          ) : (
            <p className="text-muted-foreground">Kein Verein ausgewählt.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
