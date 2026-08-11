'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { PaymentManager } from '@/components/payment-manager';
import { formatCents } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type LedgerInvoiceType = 'consumption' | 'membershipFee' | 'custom' | 'creditNote';

const TYPE_LABEL: Record<LedgerInvoiceType, string> = {
  consumption: 'Verbrauch',
  membershipFee: 'Beitrag',
  custom: 'Sonstige',
  creditNote: 'Gutschrift',
};

export type MemberLedgerEntry =
  | {
      kind: 'invoice';
      date: string;
      invoiceId: string;
      invoiceType: LedgerInvoiceType;
      invoiceNumber: string;
      invoiceStatus: 'open' | 'paid' | 'canceled';
      description: string;
      amount: number;
      runningBalance: number;
    }
  | {
      kind: 'payment';
      date: string;
      paymentId: string;
      invoiceId: string;
      invoiceType: LedgerInvoiceType;
      invoiceNumber: string;
      description: string;
      amount: number;
      rawAmount: number;
      method: string | null;
      runningBalance: number;
    };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-DE');
}

export function MemberLedger({
  entries,
  finalBalance,
  canRecordRepayment,
}: {
  entries: MemberLedgerEntry[];
  finalBalance: number;
  canRecordRepayment: boolean;
}) {
  useSignals();
  const expandedInvoiceId = useSignal<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {finalBalance === 0
          ? 'Ausgeglichen'
          : finalBalance > 0
            ? `Offener Saldo (Mitglied schuldet): ${formatCents(finalBalance)}`
            : `Offener Saldo (Verein schuldet): ${formatCents(Math.abs(finalBalance))}`}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Beleg</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Beschreibung</TableHead>
            <TableHead className="text-right">Belastung</TableHead>
            <TableHead className="text-right">Gutschrift</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Noch keine Buchungen erfasst.
              </TableCell>
            </TableRow>
          )}
          {entries.map((entry) => {
            const key = entry.kind === 'invoice' ? entry.invoiceId : entry.paymentId;
            const isRepayableCreditNote =
              entry.kind === 'invoice' && entry.invoiceType === 'creditNote' && entry.invoiceStatus === 'open';
            const isExpanded = isRepayableCreditNote && expandedInvoiceId.value === entry.invoiceId;

            return (
              <Fragment key={key}>
                <TableRow>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>
                    <Link href={`/rechnungen/${entry.invoiceId}`} className="underline underline-offset-2">
                      {entry.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.invoiceType === 'creditNote' ? 'secondary' : 'outline'}>
                      {entry.kind === 'payment' ? (entry.rawAmount < 0 ? 'Rückzahlung' : 'Zahlung') : TYPE_LABEL[entry.invoiceType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.description || '–'}</TableCell>
                  <TableCell className="text-right">{entry.amount > 0 ? formatCents(entry.amount) : ''}</TableCell>
                  <TableCell className="text-right text-emerald-600">{entry.amount < 0 ? formatCents(Math.abs(entry.amount)) : ''}</TableCell>
                  <TableCell className="text-right">{formatCents(entry.runningBalance)}</TableCell>
                  <TableCell className="text-right">
                    {canRecordRepayment && isRepayableCreditNote && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (expandedInvoiceId.value = isExpanded ? null : entry.invoiceId)}
                      >
                        {isExpanded ? 'Schließen' : 'Rückzahlung'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && entry.kind === 'invoice' && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-muted/30">
                      <PaymentManager
                        invoiceId={entry.invoiceId}
                        grossAmount={entry.amount}
                        status={entry.invoiceStatus}
                        invoiceType="creditNote"
                        canRecordPayment={canRecordRepayment}
                        initialItems={entries
                          .filter((e): e is Extract<MemberLedgerEntry, { kind: 'payment' }> => e.kind === 'payment' && e.invoiceId === entry.invoiceId)
                          .map((e) => ({ id: e.paymentId, amount: e.rawAmount, paidAt: e.date, method: e.method, note: null }))}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
