import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MembershipPeriodManager } from '@/components/membership-period-manager';
import { GarageAssignmentManager } from '@/components/garage-assignment-manager';

export default async function MitgliedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const member = await db.orm.public.ClubMember.where({ id, organizationId }).first();
  if (!member) notFound();

  const [periods, assignments, activeAssignmentsOrgWide, garages, facilities] = await Promise.all([
    db.orm.public.MembershipPeriod.where({ clubMemberId: id, organizationId }).all(),
    db.orm.public.GarageAssignment.where({ clubMemberId: id, organizationId, type: 'member' }).all(),
    db.orm.public.GarageAssignment.where({ organizationId }).where((a) => a.validTo.isNull()).all(),
    db.orm.public.Garage.where({ organizationId }).all(),
    db.orm.public.Facility.where({ organizationId }).all(),
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>
              {member.firstName} {member.lastName}
            </CardTitle>
            <CardDescription>Stammdaten des Mitglieds.</CardDescription>
          </div>
          <Link href={`/mitglieder/${member.id}/bearbeiten`}>
            <Button size="sm" variant="outline">
              Bearbeiten
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Anschrift</div>
            <div>
              {member.street ?? '–'}
              <br />
              {member.postalCode} {member.city}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Kontakt</div>
            <div>
              {member.email ?? '–'}
              <br />
              {member.phone ?? '–'}
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
