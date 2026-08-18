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

  const existingMeterLineItem = await tx.orm.public.MeterLineItem.where({ currentReadingId, organizationId }).first();
  if (existingMeterLineItem) {
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
  const lastInvoices = await tx.orm.public.Invoice.where({ garageId: garage.id, organizationId, type: 'consumption' })
    .orderBy((i) => i.periodEnd.desc())
    .take(1)
    .all();
  const lastInvoice = lastInvoices[0];

  let previousReading: MeterReading | undefined;
  let previousValue = 0;
  let periodStart: Date;

  if (lastInvoice) {
    // The meter charge (and its previous/current reading link) lives on the
    // MeterLineItem linked to the invoice's one InvoiceLineItem row, not on
    // Invoice itself — see the contract note above MeterLineItem.
    const lastLineItems = await tx.orm.public.InvoiceLineItem.where({ invoiceId: lastInvoice.id, organizationId }).all();
    const lastMeterLineItem = await tx.orm.public.MeterLineItem
      .where({ organizationId })
      .where((m) => m.lineItemId.in(lastLineItems.map((li) => li.id)))
      .first();
    if (!lastMeterLineItem) return billingError('NOT_FOUND', 'Zuletzt abgerechneter Zählerstand nicht gefunden.');
    const lastBilledReading = await tx.orm.public.MeterReading.where({ id: lastMeterLineItem.currentReadingId, organizationId }).first();
    if (!lastBilledReading) return billingError('NOT_FOUND', 'Zuletzt abgerechneter Zählerstand nicht gefunden.');
    // Same-day corrections/re-reads are common (a garage can get a second
    // reading on the same calendar date), so ties must be broken by
    // `createdAt` rather than treated as "not after" — otherwise a later,
    // legitimate same-day reading is wrongly rejected.
    const isAfterLastBilled =
      currentReading.readingDate.getTime() > lastBilledReading.readingDate.getTime() ||
      (currentReading.readingDate.getTime() === lastBilledReading.readingDate.getTime() &&
        currentReading.createdAt.getTime() > lastBilledReading.createdAt.getTime());
    if (!isAfterLastBilled) {
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
    netAmount,
    vatRate: VAT_RATE,
    vatAmount,
    grossAmount,
    status: 'open',
  });

  const lineItem = await tx.orm.public.InvoiceLineItem.create({
    organizationId,
    invoiceId: invoice.id,
    description: 'Stromverbrauch',
    quantity: consumptionKwh.toString(),
    unitPrice: price.pricePerKwh,
    netAmount,
  });

  await tx.orm.public.MeterLineItem.create({
    organizationId,
    lineItemId: lineItem.id,
    previousReadingId: previousReading?.id,
    currentReadingId: currentReading.id,
    consumptionKwh: consumptionKwh.toString(),
    pricePerKwh: price.pricePerKwh,
  });

  // Mark every reading swept into this invoice's billed period as
  // "contained in invoice" — not just the exact endpoint — so readings that
  // were taken but skipped by a previous, narrower invoice generation are
  // visibly accounted for too. Boundaries are (readingDate, createdAt)
  // tuples, not readingDate alone, so same-day readings on either boundary
  // (e.g. a same-day correction after `previousReading`, or an even later
  // same-day reading that hasn't been billed yet) are swept correctly rather
  // than by date-only granularity.
  const candidateReadings = await tx.orm.public.MeterReading.where({ garageId: garage.id, organizationId }).all();
  const containedReadingIds = candidateReadings
    .filter((r) => {
      const afterPrevious =
        !previousReading ||
        r.readingDate.getTime() > previousReading.readingDate.getTime() ||
        (r.readingDate.getTime() === previousReading.readingDate.getTime() && r.createdAt.getTime() > previousReading.createdAt.getTime());
      const upToCurrent =
        r.readingDate.getTime() < currentReading.readingDate.getTime() ||
        (r.readingDate.getTime() === currentReading.readingDate.getTime() && r.createdAt.getTime() <= currentReading.createdAt.getTime());
      return afterPrevious && upToCurrent;
    })
    .map((r) => r.id);
  // `.update()` only touches the first matching row — this must sweep every
  // reading in the range, so `.updateAll()` is required here.
  await tx.orm.public.MeterReading.where({ organizationId }).where((r) => r.id.in(containedReadingIds)).updateAll({ invoiceId: invoice.id });

  return { success: true, data: invoice };
}
