import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCents } from '@/lib/format-money';
import { PaymentManager } from '@/components/payment-manager';

const STATUS_LABEL: Record<string, string> = { open: 'Offen', paid: 'Bezahlt', canceled: 'Storniert' };
const STATUS_VARIANT: Record<string, 'outline' | 'secondary' | 'destructive'> = {
  open: 'outline',
  paid: 'secondary',
  canceled: 'destructive',
};

function formatDate(value: Date) {
  return value.toLocaleDateString('de-DE');
}

function formatDateTime(value: Date) {
  return value.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function RechnungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) notFound();

  const invoice = await db.orm.public.Invoice.where({ id, organizationId }).first();
  if (!invoice) notFound();

  const isConsumption = invoice.type === 'consumption';

  const [member, garage, payments, canRecordPayment, previousReading, currentReading, lineItems] = await Promise.all([
    db.orm.public.ClubMember.where({ id: invoice.clubMemberId, organizationId }).first(),
    invoice.garageId ? db.orm.public.Garage.where({ id: invoice.garageId, organizationId }).first() : Promise.resolve(null),
    db.orm.public.Payment.where({ invoiceId: id, organizationId }).orderBy((p) => p.paidAt.desc()).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { invoice: ['update'] } } })
      .then((result) => result.success),
    invoice.previousReadingId
      ? db.orm.public.MeterReading.where({ id: invoice.previousReadingId, organizationId }).first()
      : Promise.resolve(null),
    invoice.currentReadingId
      ? db.orm.public.MeterReading.where({ id: invoice.currentReadingId, organizationId }).first()
      : Promise.resolve(null),
    isConsumption ? Promise.resolve([]) : db.orm.public.InvoiceLineItem.where({ invoiceId: id, organizationId }).all(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Rechnung {invoice.invoiceNumber}</CardTitle>
            <CardDescription>
              {member ? `${member.firstName} ${member.lastName}` : 'Unbekanntes Mitglied'}
              {isConsumption ? ` · Garage ${garage?.number ?? '–'}` : invoice.description ? ` · ${invoice.description}` : ''}
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
        </CardHeader>
        {isConsumption ? (
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Vorheriger abgerechneter Zählerstand</div>
              <div>
                {previousReading ? `${formatDateTime(invoice.periodStart)} · ${previousReading.value} kWh` : '–'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Aktueller Zählerstand</div>
              <div>
                {formatDateTime(invoice.periodEnd)}
                {currentReading ? ` · ${currentReading.value} kWh` : ''}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Verbrauch</div>
              <div>{invoice.consumptionKwh} kWh</div>
            </div>
            <div>
              <div className="text-muted-foreground">Preis/kWh</div>
              <div>{formatCents(invoice.pricePerKwh ?? 0)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Rechnungsdatum</div>
              <div>{formatDate(invoice.issueDate)}</div>
            </div>
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
          </CardContent>
        ) : (
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
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCents(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCents(item.netAmount)}</TableCell>
                  </TableRow>
                ))}
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
        )}
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
