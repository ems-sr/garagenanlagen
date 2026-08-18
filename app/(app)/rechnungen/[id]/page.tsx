import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCents } from '@/lib/format-money';
import { PaymentManager } from '@/components/payment-manager';

const STATUS_LABEL: Record<string, string> = { open: 'Offen', partiallyPaid: 'Teilzahlung', paid: 'Bezahlt', canceled: 'Storniert' };
const STATUS_VARIANT: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  open: 'outline',
  partiallyPaid: 'secondary',
  paid: 'default',
  canceled: 'destructive',
};

function formatDate(value: Date) {
  return value.toLocaleDateString('de-DE');
}

export default async function RechnungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const invoice = await db.orm.public.Invoice.where({ id, organizationId }).first();
  if (!invoice) notFound();

  const [member, garage, payments, canRecordPayment, lineItems] = await Promise.all([
    db.orm.public.ClubMember.where({ id: invoice.clubMemberId, organizationId }).first(),
    invoice.garageId ? db.orm.public.Garage.where({ id: invoice.garageId, organizationId }).first() : Promise.resolve(null),
    db.orm.public.Payment.where({ invoiceId: id, organizationId }).orderBy((p) => p.paidAt.desc()).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { invoice: ['update'] } } })
      .then((result) => result.success),
    db.orm.public.InvoiceLineItem.where({ invoiceId: id, organizationId }).all(),
  ]);

  const lineItemIds = lineItems.map((item) => item.id);
  const meterLineItems =
    lineItemIds.length > 0
      ? await db.orm.public.MeterLineItem.where({ organizationId }).where((m) => m.lineItemId.in(lineItemIds)).all()
      : [];
  const readingIds = meterLineItems.flatMap((m) => [m.previousReadingId, m.currentReadingId].filter((v): v is string => v != null));
  const readings =
    readingIds.length > 0
      ? await db.orm.public.MeterReading.where({ organizationId }).where((r) => r.id.in(readingIds)).all()
      : [];
  const readingById = new Map(readings.map((r) => [r.id, r]));
  const meterDetailByLineItemId = new Map(
    meterLineItems.map((m) => [
      m.lineItemId,
      {
        previousReading: m.previousReadingId ? (readingById.get(m.previousReadingId) ?? null) : null,
        currentReading: readingById.get(m.currentReadingId) ?? null,
        consumptionKwh: m.consumptionKwh,
        pricePerKwh: m.pricePerKwh,
      },
    ]),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Rechnung {invoice.invoiceNumber}</CardTitle>
            <CardDescription>
              {member ? `${member.firstName} ${member.lastName}` : 'Unbekanntes Mitglied'}
              {invoice.garageId ? ` · Garage ${garage?.number ?? '–'}` : invoice.description ? ` · ${invoice.description}` : ''}
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            Zeitraum {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)} · Rechnungsdatum {formatDate(invoice.issueDate)}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Menge</TableHead>
                <TableHead>Einzelpreis</TableHead>
                <TableHead className="text-right">Netto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => {
                const meterDetail = meterDetailByLineItemId.get(item.id);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.description}
                      {meterDetail && (
                        <div className="text-xs text-muted-foreground">
                          Zählerstand {meterDetail.previousReading ? `${meterDetail.previousReading.value} kWh` : '0 kWh'} →{' '}
                          {meterDetail.currentReading ? `${meterDetail.currentReading.value} kWh` : '–'} · {formatDate(invoice.periodStart)} –{' '}
                          {formatDate(invoice.periodEnd)} · {formatCents(meterDetail.pricePerKwh)}/kWh
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCents(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCents(item.netAmount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Netto</div>
              <div>{formatCents(invoice.netAmount)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">MwSt. ({invoice.vatRate}%)</div>
              <div>{formatCents(invoice.vatAmount)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Brutto</div>
              <div className="font-medium">{formatCents(invoice.grossAmount)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zahlungen</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentManager
            invoiceId={invoice.id}
            grossAmount={invoice.grossAmount}
            status={invoice.status}
            invoiceType={invoice.type}
            canRecordPayment={canRecordPayment}
            initialItems={payments.map((payment) => ({
              id: payment.id,
              amount: payment.amount,
              paidAt: payment.paidAt.toISOString(),
              method: payment.method,
              note: payment.note,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
