import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberForm } from '@/components/member-form';

export default function NeuesMitgliedPage() {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Neues Mitglied</CardTitle>
        <CardDescription>Stammdaten eines neuen Vereinsmitglieds erfassen.</CardDescription>
      </CardHeader>
      <CardContent>
        <MemberForm />
      </CardContent>
    </Card>
  );
}
