import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, ReportHeader, formatCentsForPdf, formatDateForPdf } from './shared';
import type { FinancialReportResult } from '@/lib/reports/financial-report';

const TYPE_LABEL: Record<string, string> = { consumption: 'Verbrauch', membershipFee: 'Beitrag', custom: 'Sonstige' };
const STATUS_LABEL: Record<string, string> = { open: 'Offen', paid: 'Bezahlt', canceled: 'Storniert' };

export function FinancialReportPdf({
  data,
  organizationName,
  generatedAt,
}: {
  data: FinancialReportResult;
  organizationName?: string;
  generatedAt: Date;
}) {
  const subtitle = `Zeitraum ${formatDateForPdf(data.filters.dateFrom)} – ${formatDateForPdf(data.filters.dateTo)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader organizationName={organizationName} title="Finanzbericht" subtitle={subtitle} generatedAt={generatedAt} />
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableCell}>Typ</Text>
            <Text style={styles.tableCell}>Status</Text>
            <Text style={styles.tableCellRight}>Anzahl</Text>
            <Text style={styles.tableCellRight}>Netto</Text>
            <Text style={styles.tableCellRight}>MwSt.</Text>
            <Text style={styles.tableCellRight}>Brutto</Text>
          </View>
          {data.groups.map((group) => (
            <View style={styles.tableRow} key={`${group.type}:${group.status}`}>
              <Text style={styles.tableCell}>{TYPE_LABEL[group.type] ?? group.type}</Text>
              <Text style={styles.tableCell}>{STATUS_LABEL[group.status] ?? group.status}</Text>
              <Text style={styles.tableCellRight}>{group.count}</Text>
              <Text style={styles.tableCellRight}>{formatCentsForPdf(group.netAmount)}</Text>
              <Text style={styles.tableCellRight}>{formatCentsForPdf(group.vatAmount)}</Text>
              <Text style={styles.tableCellRight}>{formatCentsForPdf(group.grossAmount)}</Text>
            </View>
          ))}
          {data.groups.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Keine Rechnungen im Zeitraum.</Text>
            </View>
          )}
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.tableCell}>Gesamt (in Rechnung gestellt)</Text>
          <Text style={styles.tableCell} />
          <Text style={styles.tableCellRight}>{data.totals.count}</Text>
          <Text style={styles.tableCellRight}>{formatCentsForPdf(data.totals.netAmount)}</Text>
          <Text style={styles.tableCellRight}>{formatCentsForPdf(data.totals.vatAmount)}</Text>
          <Text style={styles.tableCellRight}>{formatCentsForPdf(data.totals.grossAmount)}</Text>
        </View>
        <View style={{ marginTop: 16 }}>
          <Text>
            Zahlungseingänge im Zeitraum: {data.paymentsTotal.count} Zahlung(en), {formatCentsForPdf(data.paymentsTotal.amount)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
