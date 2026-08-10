import { db } from '@/prisma/db';
import { generateInvoiceForReading } from './generate-invoice';
import type { BillingError } from './types';

type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;

export type BulkInvoiceResult = {
  created: Invoice[];
  skipped: { garageId: string; error: BillingError }[];
};

// Iterates every Garage in the facility, finds its latest MeterReading not
// yet referenced by an Invoice, and bills it — a garage without a billable
// reading (none yet, or the latest is already invoiced/still-first-reading)
// is skipped, not failed, so one garage's state never blocks the batch. Each
// garage gets its own transaction so a genuine DB error on one garage can't
// roll back invoices already created for others in the same run.
export async function generateBulkInvoicesForFacility(organizationId: string, facilityId: string): Promise<BulkInvoiceResult> {
  const garages = await db.orm.public.Garage.where({ organizationId, facilityId }).all();

  const created: Invoice[] = [];
  const skipped: { garageId: string; error: BillingError }[] = [];

  for (const garage of garages) {
    const latestReadings = await db.orm.public.MeterReading.where({ garageId: garage.id, organizationId })
      .orderBy((r) => r.readingDate.desc())
      .take(1)
      .all();
    const latestReading = latestReadings[0];
    if (!latestReading) {
      skipped.push({ garageId: garage.id, error: { code: 'NO_READING', message: 'Keine Zählerstände für diese Garage vorhanden.' } });
      continue;
    }

    const result = await db.transaction((tx) => generateInvoiceForReading(tx, organizationId, latestReading.id));

    if (result.success) {
      created.push(result.data);
    } else {
      skipped.push({ garageId: garage.id, error: result.error });
    }
  }

  return { created, skipped };
}
