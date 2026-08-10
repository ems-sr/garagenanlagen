import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailTemplateManager } from '@/components/email-template-manager';
import { SendCorrespondenceDialog } from '@/components/send-correspondence-dialog';
import { CorrespondenceLogTable } from '@/components/correspondence-log-table';

export default async function KorrespondenzPage() {
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

  const [templates, members, facilities, logs, canSend, canManageTemplates] = await Promise.all([
    db.orm.public.EmailTemplate.where({ organizationId }).all(),
    db.orm.public.ClubMember.where({ organizationId }).all(),
    db.orm.public.Facility.where({ organizationId }).all(),
    db.orm.public.CorrespondenceLog.where({ organizationId }).orderBy((log) => log.sentAt.desc()).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { correspondence: ['create'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { correspondence: ['update'] } } })
      .then((result) => result.success),
  ]);

  const memberById = new Map(members.map((member) => [member.id, member]));

  return (
    <Tabs defaultValue="verlauf">
      <TabsList>
        <TabsTrigger value="verlauf">Verlauf</TabsTrigger>
        <TabsTrigger value="vorlagen">Vorlagen</TabsTrigger>
      </TabsList>

      <TabsContent value="verlauf">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Korrespondenz</CardTitle>
              <CardDescription>Versendete E-Mails an Mitglieder.</CardDescription>
            </div>
            {canSend && (
              <SendCorrespondenceDialog
                scope="org"
                templates={templates.map((template) => ({ id: template.id, name: template.name, subject: template.subject, body: template.body }))}
                members={members.map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}` }))}
                facilities={facilities.map((facility) => ({ id: facility.id, name: facility.name }))}
              />
            )}
          </CardHeader>
          <CardContent>
            <CorrespondenceLogTable
              items={logs.map((log) => {
                const member = memberById.get(log.clubMemberId);
                return {
                  id: log.id,
                  memberName: member ? `${member.firstName} ${member.lastName}` : '–',
                  recipientEmail: log.recipientEmail,
                  subject: log.subject,
                  status: log.status,
                  errorMessage: log.errorMessage,
                  sentAt: log.sentAt.toISOString(),
                };
              })}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="vorlagen">
        <Card>
          <CardHeader>
            <CardTitle>Vorlagen</CardTitle>
            <CardDescription>Wiederverwendbare Betreff-/Textvorlagen für die Korrespondenz.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmailTemplateManager
              initialItems={templates.map((template) => ({ id: template.id, name: template.name, subject: template.subject, body: template.body }))}
              canEdit={canManageTemplates}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
