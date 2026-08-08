import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberForm } from '@/components/member-form';

export default async function MitgliedBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const member = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!member) notFound();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>
          Mitglied bearbeiten: {member.firstName} {member.lastName}
        </CardTitle>
        <CardDescription>Stammdaten des Mitglieds ändern.</CardDescription>
      </CardHeader>
      <CardContent>
        <MemberForm
          memberId={member.id}
          initialValues={{
            firstName: member.firstName,
            lastName: member.lastName,
            street: member.street ?? '',
            postalCode: member.postalCode ?? '',
            city: member.city ?? '',
            email: member.email ?? '',
            phone: member.phone ?? '',
          }}
        />
      </CardContent>
    </Card>
  );
}
