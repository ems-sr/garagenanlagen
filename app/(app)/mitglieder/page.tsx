import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberListTable } from '@/components/member-list-table';

export default async function MitgliederPage() {
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

  const [members, periods] = await Promise.all([
    db.orm.public.ClubMember.where({ organizationId }).all(),
    db.orm.public.MembershipPeriod.where({ organizationId }).all(),
  ]);

  const now = new Date();
  const activeMemberIds = new Set(
    periods.filter((period) => !period.endDate || period.endDate >= now).map((period) => period.clubMemberId),
  );

  const items = members.map((member) => ({
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    city: member.city,
    active: activeMemberIds.has(member.id),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mitgliederverwaltung</CardTitle>
        <CardDescription>Vereinsmitglieder verwalten.</CardDescription>
      </CardHeader>
      <CardContent>
        <MemberListTable items={items} />
      </CardContent>
    </Card>
  );
}
