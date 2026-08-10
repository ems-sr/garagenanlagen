import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type LogRow = {
  id: string;
  memberName: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  sentAt: string;
};

const STATUS_LABEL: Record<LogRow['status'], string> = { sent: 'Gesendet', failed: 'Fehlgeschlagen' };
const STATUS_VARIANT: Record<LogRow['status'], 'secondary' | 'destructive'> = { sent: 'secondary', failed: 'destructive' };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function CorrespondenceLogTable({ items, showMember = true }: { items: LogRow[]; showMember?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showMember && <TableHead>Mitglied</TableHead>}
          <TableHead>Betreff</TableHead>
          <TableHead>Empfänger</TableHead>
          <TableHead>Gesendet am</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={showMember ? 5 : 4} className="text-center text-muted-foreground">
              Keine Korrespondenz gefunden.
            </TableCell>
          </TableRow>
        )}
        {items.map((log) => (
          <TableRow key={log.id}>
            {showMember && <TableCell>{log.memberName}</TableCell>}
            <TableCell>{log.subject}</TableCell>
            <TableCell>{log.recipientEmail}</TableCell>
            <TableCell>{formatDateTime(log.sentAt)}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[log.status]} title={log.errorMessage ?? undefined}>
                {STATUS_LABEL[log.status]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
