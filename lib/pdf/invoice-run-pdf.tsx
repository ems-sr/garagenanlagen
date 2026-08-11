import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, ReportHeader, formatCentsForPdf, formatDateForPdf } from './shared';
import type { InvoiceRunResult } from '@/lib/reports/invoice-run';

const TYPE_LABEL: Record<string, string> = { consumption: 'Verbrauch', membershipFee: 'Beitrag', custom: 'Sonstige', creditNote: 'Gutschrift' };
const STATUS_LABEL: Record<string, string> = { open: 'Offen', partiallyPaid: 'Teilzahlung', paid: 'Bezahlt', canceled: 'Storniert' };

export function InvoiceRunPdf({
  data,
  organizationName,
  generatedAt,
}: {
  data: InvoiceRunResult;
  organizationName?: string;
  generatedAt: Date;
}) {
  const subtitle = `Zeitraum ${formatDateForPdf(data.filters.dateFrom)} – ${formatDateForPdf(data.filters.dateTo)}`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <ReportHeader organizationName={organizationName} title="Rechnungslauf" subtitle={subtitle} generatedAt={generatedAt} />
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableCell}>Nr.</Text>
            <Text style={styles.tableCell}>Typ</Text>
            <Text style={styles.tableCell}>Mitglied</Text>
            <Text style={styles.tableCell}>Garage</Text>
            <Text style={styles.tableCell}>Datum</Text>
            <Text style={styles.tableCellRight}>Netto</Text>
            <Text style={styles.tableCellRight}>MwSt.</Text>
            <Text style={styles.tableCellRight}>Brutto</Text>
            <Text style={styles.tableCell}>Status</Text>
          </View>
          {data.rows.map((row) => (
            <View style={styles.tableRow} key={row.id}>
              <Text style={styles.tableCell}>{row.invoiceNumber}</Text>
              <Text style={styles.tableCell}>{TYPE_LABEL[row.type] ?? row.type}</Text>
              <Text style={styles.tableCell}>{row.memberName}</Text>
              <Text style={styles.tableCell}>{row.garageNumber ?? '–'}</Text>
              <Text style={styles.tableCell}>{formatDateForPdf(row.issueDate)}</Text>
              <Text style={styles.tableCellRight}>{formatCentsForPdf(row.netAmount)}</Text>
              <Text style={styles.tableCellRight}>{formatCentsForPdf(row.vatAmount)}</Text>
              <Text style={styles.tableCellRight}>{formatCentsForPdf(row.grossAmount)}</Text>
              <Text style={styles.tableCell}>{STATUS_LABEL[row.status] ?? row.status}</Text>
            </View>
          ))}
          {data.rows.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Keine Rechnungen im Zeitraum.</Text>
            </View>
          )}
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.tableCell}>
            Gesamt: {data.totals.count} Rechnung(en), {data.totals.paidCount} bezahlt, {data.totals.openCount} offen
          </Text>
          <Text style={styles.tableCell} />
          <Text style={styles.tableCell} />
          <Text style={styles.tableCell} />
          <Text style={styles.tableCellRight}>{formatCentsForPdf(data.totals.netAmount)}</Text>
          <Text style={styles.tableCellRight}>{formatCentsForPdf(data.totals.vatAmount)}</Text>
          <Text style={styles.tableCellRight}>{formatCentsForPdf(data.totals.grossAmount)}</Text>
          <Text style={styles.tableCell} />
        </View>
      </Page>
    </Document>
  );
}
