import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FacilityForm } from '@/components/facility-form';

export default function NeueGaragenanlagePage() {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Neue Garagenanlage</CardTitle>
        <CardDescription>Stammdaten einer neuen Garagenanlage erfassen.</CardDescription>
      </CardHeader>
      <CardContent>
        <FacilityForm />
      </CardContent>
    </Card>
  );
}
