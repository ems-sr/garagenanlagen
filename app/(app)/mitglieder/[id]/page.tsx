import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MembershipPeriodManager } from '@/components/membership-period-manager';
import { GarageAssignmentManager } from '@/components/garage-assignment-manager';
import { MemberAddressManager } from '@/components/member-address-manager';
import { MemberContactManager } from '@/components/member-contact-manager';
import { MemberNameEditor } from '@/components/member-name-editor';
import { SendCorrespondenceDialog } from '@/components/send-correspondence-dialog';
import { CorrespondenceLogTable } from '@/components/correspondence-log-table';

export default async function MitgliedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const member = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!member) notFound();

  const [periods, assignments, activeAssignmentsOrgWide, garages, facilities, addresses, contacts, templates, logs, canSend] =
    await Promise.all([
      db.orm.public.MembershipPeriod.where({ clubMemberId: id, organizationId }).all(),
      db.orm.public.GarageAssignment.where({ clubMemberId: id, organizationId, type: 'member' }).all(),
      db.orm.public.GarageAssignment.where({ organizationId }).where((a) => a.validTo.isNull()).all(),
      db.orm.public.Garage.where({ organizationId }).all(),
      db.orm.public.Facility.where({ organizationId }).all(),
      db.orm.public.MemberAddress.where({ clubMemberId: id, organizationId }).all(),
      db.orm.public.MemberContact.where({ clubMemberId: id, organizationId }).all(),
      db.orm.public.EmailTemplate.where({ organizationId }).all(),
      db.orm.public.CorrespondenceLog.where({ clubMemberId: id, organizationId }).orderBy((log) => log.sentAt.desc()).all(),
      auth.api
        .hasPermission({ headers: await headers(), body: { organizationId, permissions: { correspondence: ['create'] } } })
        .then((result) => result.success),
    ]);

  const facilityNameById = new Map(facilities.map((facility) => [facility.id, facility.name]));
  const garageById = new Map(garages.map((garage) => [garage.id, garage]));

  // A garage with any active assignment (member/user/tenant) isn't offered
  // for a new member-assignment here — the API's cross-type business rules
  // would reject it anyway; this just avoids an avoidable round-trip.
  const assignedGarageIds = new Set(activeAssignmentsOrgWide.map((a) => a.garageId));
  const availableGarages = garages
    .filter((garage) => !assignedGarageIds.has(garage.id))
    .map((garage) => ({
      id: garage.id,
      number: garage.number,
      facilityName: facilityNameById.get(garage.facilityId) ?? '',
    }));

  return (
    <Tabs defaultValue="stammdaten">
      <TabsList>
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="mitgliedschaftszeitraeume">Mitgliedschaftszeiträume</TabsTrigger>
        <TabsTrigger value="adressen">Adressen</TabsTrigger>
        <TabsTrigger value="kontakte">Kontakte</TabsTrigger>
        <TabsTrigger value="garagen">Garagen</TabsTrigger>
        <TabsTrigger value="korrespondenz">Korrespondenz</TabsTrigger>
      </TabsList>

      <TabsContent value="stammdaten">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>
                {member.firstName} {member.lastName}
              </CardTitle>
              <CardDescription>Stammdaten des Mitglieds.</CardDescription>
            </div>
            <MemberNameEditor
              memberId={member.id}
              initialValues={{ firstName: member.firstName, lastName: member.lastName }}
            />
          </CardHeader>
        </Card>
      </TabsContent>

      <TabsContent value="mitgliedschaftszeitraeume">
        <Card>
          <CardHeader>
            <CardTitle>Mitgliedschaftszeiträume</CardTitle>
          </CardHeader>
          <CardContent>
            <MembershipPeriodManager
              memberId={member.id}
              initialItems={periods.map((period) => ({
                id: period.id,
                startDate: period.startDate.toISOString(),
                endDate: period.endDate ? period.endDate.toISOString() : null,
              }))}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="adressen">
        <Card>
          <CardHeader>
            <CardTitle>Adressen</CardTitle>
            <CardDescription>Weitere Adressen des Mitglieds.</CardDescription>
          </CardHeader>
          <CardContent>
            <MemberAddressManager
              memberId={member.id}
              initialItems={addresses.map((address) => ({
                id: address.id,
                type: address.type,
                street: address.street,
                houseNumber: address.houseNumber,
                postalCode: address.postalCode,
                city: address.city,
              }))}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="kontakte">
        <Card>
          <CardHeader>
            <CardTitle>Kontakte</CardTitle>
            <CardDescription>Weitere Kontaktmöglichkeiten des Mitglieds.</CardDescription>
          </CardHeader>
          <CardContent>
            <MemberContactManager
              memberId={member.id}
              initialItems={contacts.map((contact) => ({
                id: contact.id,
                type: contact.type,
                value: contact.value,
              }))}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="garagen">
        <Card>
          <CardHeader>
            <CardTitle>Garagen</CardTitle>
            <CardDescription>Dem Mitglied zugeordnete Garagen.</CardDescription>
          </CardHeader>
          <CardContent>
            <GarageAssignmentManager
              memberId={member.id}
              initialItems={assignments.map((assignment) => {
                const garage = garageById.get(assignment.garageId);
                return {
                  id: assignment.id,
                  garageNumber: garage?.number ?? '',
                  facilityName: garage ? (facilityNameById.get(garage.facilityId) ?? '') : '',
                  validFrom: assignment.validFrom.toISOString(),
                  validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
                };
              })}
              availableGarages={availableGarages}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="korrespondenz">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Korrespondenz</CardTitle>
              <CardDescription>Verlauf der an dieses Mitglied gesendeten E-Mails.</CardDescription>
            </div>
            {canSend && (
              <SendCorrespondenceDialog
                scope="fixedMember"
                fixedClubMemberId={member.id}
                templates={templates.map((template) => ({ id: template.id, name: template.name, subject: template.subject, body: template.body }))}
              />
            )}
          </CardHeader>
          <CardContent>
            <CorrespondenceLogTable
              showMember={false}
              items={logs.map((log) => ({
                id: log.id,
                memberName: `${member.firstName} ${member.lastName}`,
                recipientEmail: log.recipientEmail,
                subject: log.subject,
                status: log.status,
                errorMessage: log.errorMessage,
                sentAt: log.sentAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
