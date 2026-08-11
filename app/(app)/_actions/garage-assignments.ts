'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createGarageAssignmentSchema,
  updateGarageAssignmentSchema,
  type CreateGarageAssignmentInput,
  type UpdateGarageAssignmentInput,
} from '@/lib/validation/garage-assignment';
import { logGarageUsageEvent } from '@/lib/garages/usage-events';

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  member: 'Mitglied',
  user: 'Nutzer',
  tenant: 'Mieter',
};

type GarageAssignment = Awaited<ReturnType<typeof db.orm.public.GarageAssignment.create>>;

export async function createGarageAssignment(input: CreateGarageAssignmentInput): Promise<ActionResult<GarageAssignment>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createGarageAssignmentSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);
  const data = parsed.data;

  const garage = await db.orm.public.Garage.where({ id: data.garageId, organizationId }).first();
  if (!garage) return actionError('INVALID_GARAGE', 'Garage nicht gefunden.');

  const activeMember = await db.orm.public.GarageAssignment.where({ garageId: data.garageId, organizationId, type: 'member' })
    .where((a) => a.validTo.isNull())
    .first();
  const activeUser = await db.orm.public.GarageAssignment.where({ garageId: data.garageId, organizationId, type: 'user' })
    .where((a) => a.validTo.isNull())
    .first();
  const activeTenant = await db.orm.public.GarageAssignment.where({ garageId: data.garageId, organizationId, type: 'tenant' })
    .where((a) => a.validTo.isNull())
    .first();

  if (data.type === 'member') {
    const member = await db.orm.public.ClubMember.where({ id: data.clubMemberId, organizationId }).first();
    if (!member) return actionError('INVALID_MEMBER', 'Mitglied nicht gefunden.');
    if (activeTenant) {
      return actionError('CONFLICTING_ASSIGNMENT', 'Garage ist bereits direkt an einen Mieter vermietet.');
    }
  }

  if (data.type === 'user') {
    const garageUser = await db.orm.public.GarageUser.where({ id: data.garageUserId, organizationId }).first();
    if (!garageUser) return actionError('INVALID_GARAGE_USER', 'Garagennutzer nicht gefunden.');
    if (!activeMember) {
      return actionError('NO_ACTIVE_MEMBER_ASSIGNMENT', 'Garage ist derzeit keinem Mitglied zugewiesen.');
    }
  }

  if (data.type === 'tenant') {
    const tenant = await db.orm.public.Tenant.where({ id: data.tenantId, organizationId }).first();
    if (!tenant) return actionError('INVALID_TENANT', 'Mieter nicht gefunden.');
    if (activeMember || activeUser) {
      return actionError('CONFLICTING_ASSIGNMENT', 'Garage ist derzeit einem Mitglied zugewiesen.');
    }
  }

  const assignment = await db.orm.public.GarageAssignment.create({ ...data, organizationId });

  await logGarageUsageEvent(
    db,
    organizationId,
    data.garageId,
    'assignmentStarted',
    `Zuordnung gestartet (${ASSIGNMENT_TYPE_LABELS[data.type]}).`,
    data.type === 'member' ? data.clubMemberId : null,
  );

  return { success: true, data: assignment };
}

// Only ends an assignment (validTo) — identity (type, party) isn't editable;
// create a new assignment for a party change instead.
export async function endGarageAssignment(
  assignmentId: string,
  input: UpdateGarageAssignmentInput,
): Promise<ActionResult<GarageAssignment>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { member: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.GarageAssignment.where({ id: assignmentId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Zuordnung nicht gefunden.');

  const parsed = updateGarageAssignmentSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const assignment = await db.orm.public.GarageAssignment.where({ id: assignmentId, organizationId }).update(parsed.data);
  if (!assignment) return actionError('NOT_FOUND', 'Zuordnung nicht gefunden.');

  if (!existing.validTo && assignment.validTo) {
    await logGarageUsageEvent(
      db,
      organizationId,
      existing.garageId,
      'assignmentEnded',
      `Zuordnung beendet (${ASSIGNMENT_TYPE_LABELS[existing.type]}).`,
      existing.type === 'member' ? existing.clubMemberId : null,
    );
  }

  return { success: true, data: assignment };
}
