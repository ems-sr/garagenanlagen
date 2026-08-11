import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShiftParticipantManager } from '@/components/shift-participant-manager';

function formatDate(value: Date) {
  return value.toLocaleDateString('de-DE');
}

const REIMBURSEMENT_UNIT_LABELS: Record<'hourly' | 'fixed', string> = {
  hourly: 'Stundensatz',
  fixed: 'Fixbetrag (Kautionsrückerstattung)',
};

export default async function ArbeitseinsatzDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const workShift = await db.orm.public.WorkShift.where({ id, organizationId }).first();
  if (!workShift) notFound();

  const [facility, participants, members, canEdit] = await Promise.all([
    workShift.facilityId ? db.orm.public.Facility.where({ id: workShift.facilityId, organizationId }).first() : Promise.resolve(null),
    db.orm.public.ShiftParticipant.where({ workShiftId: id, organizationId }).all(),
    db.orm.public.ClubMember.where({ organizationId }).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { workShift: ['update'] } } })
      .then((result) => result.success),
  ]);

  const memberById = new Map(members.map((member) => [member.id, member]));
  const participatingMemberIds = new Set(participants.map((participant) => participant.clubMemberId));
  const eligibleMembers = members.filter((member) => !participatingMemberIds.has(member.id));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{workShift.title}</CardTitle>
          <CardDescription>
            {formatDate(workShift.date)}
            {workShift.location ? ` · ${workShift.location}` : ''}
            {' · '}
            {facility ? facility.name : 'Vereinsweit'}
            {' · '}
            {REIMBURSEMENT_UNIT_LABELS[workShift.reimbursementUnit]}
          </CardDescription>
        </CardHeader>
        {workShift.description && <CardContent className="text-sm text-muted-foreground">{workShift.description}</CardContent>}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teilnehmer</CardTitle>
        </CardHeader>
        <CardContent>
          <ShiftParticipantManager
            workShiftId={id}
            initialItems={participants.map((participant) => {
              const member = memberById.get(participant.clubMemberId);
              return {
                id: participant.id,
                clubMemberId: participant.clubMemberId,
                memberName: member ? `${member.firstName} ${member.lastName}` : 'Unbekanntes Mitglied',
                hoursWorked: participant.hoursWorked.toString(),
                reimbursementAmount: participant.reimbursementAmount,
                paidOut: participant.paidOut,
                paidOutAt: participant.paidOutAt ? participant.paidOutAt.toISOString() : null,
              };
            })}
            eligibleMembers={eligibleMembers.map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}` }))}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
