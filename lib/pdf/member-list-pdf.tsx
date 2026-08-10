import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, ReportHeader } from './shared';
import type { MemberListResult } from '@/lib/reports/member-list';

export function MemberListPdf({
  data,
  organizationName,
  generatedAt,
}: {
  data: MemberListResult;
  organizationName?: string;
  generatedAt: Date;
}) {
  const subtitle = data.filters.activeOnly ? 'Nur aktive Mitglieder' : undefined;
  const showGarages = !!data.filters.facilityId;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader organizationName={organizationName} title="Mitgliederliste" subtitle={subtitle} generatedAt={generatedAt} />
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableCell}>Name</Text>
            <Text style={styles.tableCell}>Adresse</Text>
            <Text style={styles.tableCell}>E-Mail</Text>
            <Text style={styles.tableCell}>Telefon</Text>
            <Text style={styles.tableCell}>Status</Text>
            {showGarages && <Text style={styles.tableCell}>Garage(n)</Text>}
          </View>
          {data.rows.map((row) => (
            <View style={styles.tableRow} key={row.id}>
              <Text style={styles.tableCell}>{row.name}</Text>
              <Text style={styles.tableCell}>
                {[row.street, [row.postalCode, row.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '–'}
              </Text>
              <Text style={styles.tableCell}>{row.email ?? '–'}</Text>
              <Text style={styles.tableCell}>{row.phone ?? '–'}</Text>
              <Text style={styles.tableCell}>{row.active ? 'Aktiv' : 'Inaktiv'}</Text>
              {showGarages && <Text style={styles.tableCell}>{row.garageNumbers.join(', ') || '–'}</Text>}
            </View>
          ))}
        </View>
        <Text style={styles.meta}>{data.rows.length} Mitglied(er)</Text>
      </Page>
    </Document>
  );
}
