import { db } from '@/prisma/db';

type Orm = { orm: typeof db.orm };

// System-generated GarageUsageEvent rows (assignmentStarted/assignmentEnded),
// written by app/(app)/_actions/garage-assignments.ts right after the
// create/end action itself succeeds. Not wrapped in the same transaction as
// the assignment write — same "never wrapped in a transaction" reasoning
// Stage 6 used for CorrespondenceLog: a logged event is a side note on an
// already-committed fact, not something that should roll the assignment
// back if logging itself somehow failed.
export async function logGarageUsageEvent(
  orm: Orm,
  organizationId: string,
  garageId: string,
  eventType: 'assignmentStarted' | 'assignmentEnded',
  description: string,
  clubMemberId?: string | null,
) {
  await orm.orm.public.GarageUsageEvent.create({
    organizationId,
    garageId,
    eventType,
    description,
    clubMemberId: clubMemberId ?? undefined,
  });
}
