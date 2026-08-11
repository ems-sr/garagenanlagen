import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkShiftManager } from '@/components/work-shift-manager';

export default async function ArbeitseinsaetzePage() {
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

  const [workShifts, facilities, participants, canCreate] = await Promise.all([
    db.orm.public.WorkShift.where({ organizationId }).orderBy((s) => s.date.desc()).all(),
    db.orm.public.Facility.where({ organizationId }).all(),
    db.orm.public.ShiftParticipant.where({ organizationId }).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { workShift: ['create'] } } })
      .then((result) => result.success),
  ]);

  const participantCountByShift = new Map<string, number>();
  for (const participant of participants) {
    participantCountByShift.set(participant.workShiftId, (participantCountByShift.get(participant.workShiftId) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arbeitseinsätze</CardTitle>
        <CardDescription>Arbeitseinsätze, Teilnehmer und Aufwandsentschädigung.</CardDescription>
      </CardHeader>
      <CardContent>
        <WorkShiftManager
          initialItems={workShifts.map((shift) => ({
            id: shift.id,
            title: shift.title,
            date: shift.date.toISOString(),
            location: shift.location,
            facilityId: shift.facilityId,
            reimbursementUnit: shift.reimbursementUnit,
            participantCount: participantCountByShift.get(shift.id) ?? 0,
          }))}
          facilities={facilities.map((facility) => ({ id: facility.id, name: facility.name }))}
          canCreate={canCreate}
        />
      </CardContent>
    </Card>
  );
}
