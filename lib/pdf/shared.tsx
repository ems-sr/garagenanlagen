import { StyleSheet, Text, View } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#333333', paddingBottom: 8 },
  orgName: { fontSize: 12, fontWeight: 700 },
  title: { fontSize: 16, fontWeight: 700, marginTop: 4 },
  meta: { fontSize: 9, color: '#666666', marginTop: 2 },
  table: { display: 'flex', flexDirection: 'column', marginTop: 8 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333333', paddingVertical: 4, fontWeight: 700 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingVertical: 4 },
  tableCell: { flex: 1, paddingHorizontal: 2 },
  tableCellRight: { flex: 1, paddingHorizontal: 2, textAlign: 'right' },
  totalsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#333333', paddingTop: 6, marginTop: 6, fontWeight: 700 },
});

export function formatCentsForPdf(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export function formatDateForPdf(value: Date): string {
  return value.toLocaleDateString('de-DE');
}

export function ReportHeader({
  organizationName,
  title,
  subtitle,
  generatedAt,
}: {
  organizationName?: string;
  title: string;
  subtitle?: string;
  generatedAt: Date;
}) {
  return (
    <View style={styles.header}>
      {organizationName && <Text style={styles.orgName}>{organizationName}</Text>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.meta}>{subtitle}</Text>}
      <Text style={styles.meta}>Erstellt am {generatedAt.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
    </View>
  );
}
