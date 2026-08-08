import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClubProfileForm } from '@/components/club-profile-form';
import { BoardMemberManager } from '@/components/board-member-manager';

export default async function VereinPage() {
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

  const [organization, profile, boardMembers, canEdit, canEditName] = await Promise.all([
    auth.api.getFullOrganization({ headers: await headers(), query: { organizationId } }),
    db.orm.public.ClubProfile.where({ organizationId }).first(),
    db.orm.public.BoardMember.where({ organizationId }).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { club: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { organization: ['update'] } } })
      .then((result) => result.success),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Vereins-Stammdaten</CardTitle>
          <CardDescription>Name, Anschrift, Bankverbindung und Kontaktinformationen des Vereins.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClubProfileForm
            initialProfile={{
              name: organization?.name ?? '',
              street: profile?.street ?? '',
              postalCode: profile?.postalCode ?? '',
              city: profile?.city ?? '',
              bankIban: profile?.bankIban ?? '',
              bankBic: profile?.bankBic ?? '',
              bankName: profile?.bankName ?? '',
              accountHolder: profile?.accountHolder ?? '',
              contactEmail: profile?.contactEmail ?? '',
              contactPhone: profile?.contactPhone ?? '',
            }}
            canEdit={canEdit}
            canEditName={canEditName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vorstand</CardTitle>
          <CardDescription>Vertretungsberechtigte Personen des Vereins.</CardDescription>
        </CardHeader>
        <CardContent>
          <BoardMemberManager initialItems={boardMembers} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
