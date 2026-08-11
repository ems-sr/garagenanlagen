'use server';

import { db } from '@/prisma/db';
import { getActionContext, requireActionPermission } from '@/lib/actions/context';
import { actionError, zodActionError, type ActionResult } from '@/lib/actions/result';
import {
  createInvoiceSchema,
  createBulkInvoicesSchema,
  createMembershipFeeInvoiceSchema,
  createBulkMembershipFeeInvoicesSchema,
  createCustomInvoiceSchema,
  createCreditNoteSchema,
  type CreateInvoiceInput,
  type CreateBulkInvoicesInput,
  type CreateMembershipFeeInvoiceInput,
  type CreateBulkMembershipFeeInvoicesInput,
  type CreateCustomInvoiceInput,
  type CreateCreditNoteInput,
} from '@/lib/validation/invoice';
import { generateInvoiceForReading } from '@/lib/billing/generate-invoice';
import { generateBulkInvoicesForFacility, type BulkInvoiceResult } from '@/lib/billing/generate-bulk-invoices';
import { generateMembershipFeeInvoiceForMember } from '@/lib/billing/generate-membership-fee-invoice';
import { generateBulkMembershipFeeInvoices, type BulkMembershipFeeInvoiceResult } from '@/lib/billing/generate-bulk-membership-fee-invoices';
import { generateCustomInvoice } from '@/lib/billing/generate-custom-invoice';
import { generateCreditNote } from '@/lib/billing/generate-credit-note';

type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;

export async function generateInvoice(input: CreateInvoiceInput): Promise<ActionResult<Invoice>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await db.transaction((tx) => generateInvoiceForReading(tx, organizationId, parsed.data.meterReadingId));
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}

export async function generateBulkInvoices(input: CreateBulkInvoicesInput): Promise<ActionResult<BulkInvoiceResult>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createBulkInvoicesSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const facility = await db.orm.public.Facility.where({ id: parsed.data.facilityId, organizationId }).first();
  if (!facility) return actionError('INVALID_FACILITY', 'Garagenanlage nicht gefunden.');

  const result = await generateBulkInvoicesForFacility(organizationId, parsed.data.facilityId);
  return { success: true, data: result };
}

export async function generateMembershipFeeInvoice(input: CreateMembershipFeeInvoiceInput): Promise<ActionResult<Invoice>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createMembershipFeeInvoiceSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await db.transaction((tx) =>
    generateMembershipFeeInvoiceForMember(
      tx,
      organizationId,
      parsed.data.clubMemberId,
      parsed.data.garageId,
      parsed.data.periodStart,
      parsed.data.periodEnd,
    ),
  );
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}

export async function generateBulkMembershipFeeInvoicesAction(
  input: CreateBulkMembershipFeeInvoicesInput,
): Promise<ActionResult<BulkMembershipFeeInvoiceResult>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createBulkMembershipFeeInvoicesSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await generateBulkMembershipFeeInvoices(organizationId, parsed.data.periodStart, parsed.data.periodEnd);
  return { success: true, data: result };
}

export async function generateCustomInvoiceAction(input: CreateCustomInvoiceInput): Promise<ActionResult<Invoice>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createCustomInvoiceSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await db.transaction((tx) => generateCustomInvoice(tx, organizationId, parsed.data));
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}

export async function generateCreditNoteAction(input: CreateCreditNoteInput): Promise<ActionResult<Invoice>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['create'] });
  if (denied) return actionError(denied.code, denied.message);

  const parsed = createCreditNoteSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed);

  const result = await db.transaction((tx) => generateCreditNote(tx, organizationId, parsed.data));
  if (!result.success) return actionError(result.error.code, result.error.message);
  return { success: true, data: result.data };
}

export async function cancelInvoice(invoiceId: string): Promise<ActionResult<Invoice>> {
  const ctx = await getActionContext();
  if ('error' in ctx) return actionError(ctx.error.code, ctx.error.message);
  const { organizationId } = ctx;

  const denied = await requireActionPermission(organizationId, { invoice: ['update'] });
  if (denied) return actionError(denied.code, denied.message);

  const existing = await db.orm.public.Invoice.where({ id: invoiceId, organizationId }).first();
  if (!existing) return actionError('NOT_FOUND', 'Rechnung nicht gefunden.');
  if (existing.status === 'paid') return actionError('ALREADY_PAID', 'Bezahlte Rechnungen können nicht storniert werden.');
  if (existing.status === 'canceled') return actionError('ALREADY_CANCELED', 'Rechnung ist bereits storniert.');

  const payments = await db.orm.public.Payment.where({ invoiceId, organizationId }).all();
  if (payments.length > 0) {
    return actionError('HAS_PAYMENTS', 'Rechnung mit erfassten Zahlungen kann nicht storniert werden.');
  }

  const invoice = await db.orm.public.Invoice.where({ id: invoiceId, organizationId }).update({ status: 'canceled' });
  if (!invoice) return actionError('NOT_FOUND', 'Rechnung nicht gefunden.');
  return { success: true, data: invoice };
}
