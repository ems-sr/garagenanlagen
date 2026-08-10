import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportExportPanel } from '@/components/report-export-panel';
import { DocumentManager } from '@/components/document-manager';

export default async function BerichtePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kein Verein ausgewählt</CardTitle>
          <CardDescription>Bitte wählen Sie zunächst einen Verein aus.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [facilities, members, documents, canEditDocuments] = await Promise.all([
    db.orm.public.Facility.where({ organizationId }).all(),
    db.orm.public.ClubMember.where({ organizationId }).all(),
    db.orm.public.Document.where({ organizationId }).orderBy((d) => d.createdAt.desc()).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { document: ['create'] } } })
      .then((result) => result.success),
  ]);

  const facilityOptions = facilities.map((facility) => ({ id: facility.id, name: facility.name }));
  const memberOptions = members.map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}` }));

  return (
    <Tabs defaultValue="mitgliederliste">
      <TabsList>
        <TabsTrigger value="mitgliederliste">Mitgliederliste</TabsTrigger>
        <TabsTrigger value="finanzbericht">Finanzbericht</TabsTrigger>
        <TabsTrigger value="rechnungslauf">Rechnungslauf</TabsTrigger>
        <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
      </TabsList>

      <TabsContent value="mitgliederliste">
        <Card>
          <CardHeader>
            <CardTitle>Mitgliederliste</CardTitle>
            <CardDescription>Mitgliederliste als PDF exportieren.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportExportPanel kind="member-list" facilities={facilityOptions} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="finanzbericht">
        <Card>
          <CardHeader>
            <CardTitle>Finanzbericht</CardTitle>
            <CardDescription>Rechnungssummen und Zahlungseingänge für einen Zeitraum.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportExportPanel kind="financial-report" facilities={facilityOptions} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rechnungslauf">
        <Card>
          <CardHeader>
            <CardTitle>Rechnungslauf</CardTitle>
            <CardDescription>Alle Rechnungen eines Zeitraums im Detail.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportExportPanel kind="invoice-run" facilities={facilityOptions} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="dokumente">
        <Card>
          <CardHeader>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Hochgeladene Dokumente des Vereins.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentManager
              initialItems={documents.map((document) => ({
                id: document.id,
                fileName: document.fileName,
                mimeType: document.mimeType,
                fileSize: document.fileSize,
                description: document.description,
                clubMemberId: document.clubMemberId,
                facilityId: document.facilityId,
                createdAt: document.createdAt.toISOString(),
              }))}
              members={memberOptions}
              facilities={facilityOptions}
              canEdit={canEditDocuments}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
