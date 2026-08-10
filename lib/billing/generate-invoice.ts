import { db } from '@/prisma/db';
import { billingError, type BillingResult } from './types';
import { nextInvoiceNumber } from './invoice-number';

type Tx = { orm: typeof db.orm };
type Invoice = Awaited<ReturnType<typeof db.orm.public.Invoice.create>>;
type MeterReading = Awaited<ReturnType<typeof db.orm.public.MeterReading.create>>;

const VAT_RATE = 19;

// Bills the ClubMember holding the active ('validTo' IS NULL) 'member'-type
// GarageAssignment for the reading's garage at generation time —
// Tenant/renter invoicing is Stage 10 scope. Must run inside a transaction:
// it reads-then-writes (invoice-number sequencing, current-reading
// uniqueness) and needs the isolation.
export async function generateInvoiceForReading(
  tx: Tx,
  organizationId: string,
  currentReadingId: string,
): Promise<BillingResult<Invoice>> {
  const currentReading = await tx.orm.public.MeterReading.where({ id: currentReadingId, organizationId }).first();
  if (!currentReading) return billingError('NOT_FOUND', 'Zählerstand nicht gefunden.');

  const existingInvoice = await tx.orm.public.Invoice.where({ currentReadingId, organizationId }).first();
  if (existingInvoice) {
    return billingError('ALREADY_INVOICED', 'Für diesen Zählerstand wurde bereits eine Rechnung erstellt.');
  }

  const garage = await tx.orm.public.Garage.where({ id: currentReading.garageId, organizationId }).first();
  if (!garage) return billingError('NOT_FOUND', 'Garage nicht gefunden.');

  // The baseline is the reading the garage's last invoice was billed up to
  // (not merely the chronologically preceding reading) — so a new invoice
  // sweeps up any readings that were taken but never billed in between,
  // rather than silently dropping that consumption. A garage with no prior
  // invoice bills from a 0 kWh baseline instead of requiring a second
  // reading to diff against.
  const lastInvoices = await tx.orm.public.Invoice.where({ garageId: garage.id, organizationId })
    .orderBy((i) => i.periodEnd.desc())
    .take(1)
    .all();
  const lastInvoice = lastInvoices[0];

  let previousReading: MeterReading | undefined;
  let previousValue = 0;
  let periodStart: Date;

  if (lastInvoice) {
    const lastBilledReading = await tx.orm.public.MeterReading.where({ id: lastInvoice.currentReadingId, organizationId }).first();
    if (!lastBilledReading) return billingError('NOT_FOUND', 'Zuletzt abgerechneter Zählerstand nicht gefunden.');
    if (lastBilledReading.readingDate >= currentReading.readingDate) {
      return billingError(
        'INVALID_CONSUMPTION',
        'Der aktuelle Zählerstand liegt nicht nach dem zuletzt abgerechneten Zählerstand.',
      );
    }
    previousReading = lastBilledReading;
    previousValue = Number(previousReading.value);
    periodStart = previousReading.readingDate;
  } else {
    const earliestReadings = await tx.orm.public.MeterReading.where({ garageId: garage.id, organizationId })
      .orderBy((r) => r.readingDate.asc())
      .take(1)
      .all();
    periodStart = (earliestReadings[0] ?? currentReading).readingDate;
  }

  const activeAssignment = await tx.orm.public.GarageAssignment.where({
    garageId: garage.id,
    organizationId,
    type: 'member',
  })
    .where((a) => a.validTo.isNull())
    .first();
  if (!activeAssignment?.clubMemberId) {
    return billingError('NO_ACTIVE_MEMBER', 'Garage ist derzeit keinem Mitglied zugewiesen.');
  }

  // No `or()` combinator available yet (facade re-export pending) — filter
  // in JS instead of trying to express "validTo IS NULL OR validTo > date"
  // as a single where() clause.
  const prices = await tx.orm.public.PricePerKwh.where({ facilityId: garage.facilityId, organizationId }).all();
  const price = prices.find(
    (p) => p.validFrom <= currentReading.readingDate && (!p.validTo || p.validTo > currentReading.readingDate),
  );
  if (!price) return billingError('NO_PRICE', 'Kein gültiger Strompreis für diese Garagenanlage zum Ablesedatum hinterlegt.');

  const consumptionKwh = Number(currentReading.value) - previousValue;
  if (consumptionKwh <= 0) {
    return billingError(
      'INVALID_CONSUMPTION',
      'Der aktuelle Zählerstand ist nicht größer als der zuletzt abgerechnete Wert (bzw. 0) — bitte Zählerstände prüfen.',
    );
  }

  // Round once per output field (never round the kWh/price inputs) to avoid
  // off-by-one-cent drift across net/VAT/gross.
  const netAmount = Math.round(consumptionKwh * price.pricePerKwh);
  const vatAmount = Math.round((netAmount * VAT_RATE) / 100);
  const grossAmount = netAmount + vatAmount;

  const invoiceNumber = await nextInvoiceNumber(tx, organizationId, currentReading.readingDate);

  const invoice = await tx.orm.public.Invoice.create({
    organizationId,
    type: 'consumption',
    facilityId: garage.facilityId,
    garageId: garage.id,
    clubMemberId: activeAssignment.clubMemberId,
    invoiceNumber,
    periodStart,
    periodEnd: currentReading.readingDate,
    previousReadingId: previousReading?.id,
    currentReadingId: currentReading.id,
    consumptionKwh: consumptionKwh.toString(),
    pricePerKwh: price.pricePerKwh,
    netAmount,
    vatRate: VAT_RATE,
    vatAmount,
    grossAmount,
    status: 'open',
  });

  // Mark every reading swept into this invoice's billed period as
  // "contained in invoice" — not just the exact endpoint — so readings that
  // were taken but skipped by a previous, narrower invoice generation are
  // visibly accounted for too.
  const containedReadingsQuery = previousReading
    ? tx.orm.public.MeterReading.where({ garageId: garage.id, organizationId }).where((r) =>
        r.readingDate.gt(previousReading.readingDate),
      )
    : tx.orm.public.MeterReading.where({ garageId: garage.id, organizationId });
  // `.update()` only touches the first matching row — this must sweep every
  // reading in the range, so `.updateAll()` is required here.
  await containedReadingsQuery.where((r) => r.readingDate.lte(currentReading.readingDate)).updateAll({ invoiceId: invoice.id });

  return { success: true, data: invoice };
}
