import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClubStammdatenForm, ClubBankForm } from '@/components/club-profile-form';
import { BoardMemberManager } from '@/components/board-member-manager';
import { MembershipFeeManager } from '@/components/membership-fee-manager';
import { WorkShiftRateManager } from '@/components/work-shift-rate-manager';
import { WorkShiftDepositAmountManager } from '@/components/work-shift-deposit-amount-manager';
import { GarageAttributeTypeManager } from '@/components/garage-attribute-type-manager';
import { LineItemTypeManager } from '@/components/line-item-type-manager';
import { InvoiceTemplateManager } from '@/components/invoice-template-manager';

export default async function VereinPage() {
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

  const [
    organization,
    profile,
    boardMembers,
    membershipFees,
    workShiftRates,
    workShiftDepositAmounts,
    attributeTypes,
    lineItemTypes,
    invoiceTemplates,
    invoiceTemplateLineItems,
    canEdit,
    canEditName,
    canEditFees,
    canEditWorkShiftRates,
    canEditWorkShiftDepositAmounts,
    canEditAttributeTypes,
    canEditInvoiceTemplates,
  ] = await Promise.all([
    auth.api.getFullOrganization({ headers: await headers(), query: { organizationId } }),
    db.orm.public.ClubProfile.where({ organizationId }).first(),
    db.orm.public.BoardMember.where({ organizationId }).all(),
    db.orm.public.MembershipFee.where({ organizationId }).orderBy((f) => f.validFrom.desc()).all(),
    db.orm.public.WorkShiftReimbursementRate.where({ organizationId }).orderBy((r) => r.validFrom.desc()).all(),
    db.orm.public.WorkShiftDepositAmount.where({ organizationId }).orderBy((a) => a.validFrom.desc()).all(),
    db.orm.public.GarageAttributeType.where({ organizationId }).orderBy((t) => t.name.asc()).all(),
    db.orm.public.LineItemType.where({ organizationId }).orderBy((t) => t.name.asc()).all(),
    db.orm.public.InvoiceTemplate.where({ organizationId }).orderBy((t) => t.name.asc()).all(),
    db.orm.public.InvoiceTemplateLineItem.where({ organizationId }).orderBy((li) => li.sortOrder.asc()).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { club: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { organization: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { membershipFee: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { workShiftRate: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { workShiftDepositAmount: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { garageAttribute: ['update'] } } })
      .then((result) => result.success),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { invoiceTemplate: ['update'] } } })
      .then((result) => result.success),
  ]);

  return (
    <Tabs defaultValue="stammdaten">
      <TabsList>
        <TabsTrigger value="stammdaten">Vereins-Stammdaten</TabsTrigger>
        <TabsTrigger value="bank">Bankverbindung</TabsTrigger>
        <TabsTrigger value="vorstand">Vorstand</TabsTrigger>
        <TabsTrigger value="beitraege">Mitgliedsbeiträge</TabsTrigger>
        <TabsTrigger value="arbeitseinsatz-verguetung">Arbeitseinsatz-Vergütung</TabsTrigger>
        <TabsTrigger value="ausstattungsattribute">Ausstattungsattribute</TabsTrigger>
        <TabsTrigger value="rechnungsvorlagen">Rechnungsvorlagen</TabsTrigger>
      </TabsList>

      <TabsContent value="stammdaten">
        <Card>
          <CardHeader>
            <CardTitle>Vereins-Stammdaten</CardTitle>
            <CardDescription>Name, Anschrift und Kontaktinformationen des Vereins.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClubStammdatenForm
              initialValues={{
                name: organization?.name ?? '',
                street: profile?.street ?? '',
                postalCode: profile?.postalCode ?? '',
                city: profile?.city ?? '',
                contactEmail: profile?.contactEmail ?? '',
                contactPhone: profile?.contactPhone ?? '',
              }}
              canEdit={canEdit}
              canEditName={canEditName}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bank">
        <Card>
          <CardHeader>
            <CardTitle>Bankverbindung</CardTitle>
            <CardDescription>Kontodaten des Vereins.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClubBankForm
              initialValues={{
                bankIban: profile?.bankIban ?? '',
                bankBic: profile?.bankBic ?? '',
                bankName: profile?.bankName ?? '',
                accountHolder: profile?.accountHolder ?? '',
              }}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="vorstand">
        <Card>
          <CardHeader>
            <CardTitle>Vorstand</CardTitle>
            <CardDescription>Vertretungsberechtigte Personen des Vereins.</CardDescription>
          </CardHeader>
          <CardContent>
            <BoardMemberManager initialItems={boardMembers} canEdit={canEdit} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="beitraege">
        <Card>
          <CardHeader>
            <CardTitle>Mitgliedsbeiträge</CardTitle>
            <CardDescription>Beitragssatz für die Vereinsmitglieder, mit Gültigkeitszeitraum.</CardDescription>
          </CardHeader>
          <CardContent>
            <MembershipFeeManager
              initialItems={membershipFees.map((fee) => ({
                id: fee.id,
                description: fee.description,
                amount: fee.amount,
                validFrom: fee.validFrom.toISOString(),
                validTo: fee.validTo ? fee.validTo.toISOString() : null,
              }))}
              canEdit={canEditFees}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="arbeitseinsatz-verguetung">
        <Card>
          <CardHeader>
            <CardTitle>Arbeitseinsatz-Vergütung</CardTitle>
            <CardDescription>Aufwandsentschädigung pro Stunde für Arbeitseinsätze, mit Gültigkeitszeitraum.</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkShiftRateManager
              initialItems={workShiftRates.map((rate) => ({
                id: rate.id,
                amountPerHour: rate.amountPerHour,
                validFrom: rate.validFrom.toISOString(),
                validTo: rate.validTo ? rate.validTo.toISOString() : null,
              }))}
              canEdit={canEditWorkShiftRates}
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Kaution Arbeitseinsatz (Fixbetrag)</CardTitle>
            <CardDescription>
              Jährlicher Kautionsbetrag, der bei der Mitgliedsbeitragsrechnung eingehoben und bei Teilnahme an einem Arbeitseinsatz mit
              Vergütungsart &bdquo;Fixbetrag&ldquo; in voller Höhe erstattet wird.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkShiftDepositAmountManager
              initialItems={workShiftDepositAmounts.map((amount) => ({
                id: amount.id,
                amount: amount.amount,
                validFrom: amount.validFrom.toISOString(),
                validTo: amount.validTo ? amount.validTo.toISOString() : null,
              }))}
              canEdit={canEditWorkShiftDepositAmounts}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ausstattungsattribute">
        <Card>
          <CardHeader>
            <CardTitle>Ausstattungsattribute</CardTitle>
            <CardDescription>Vereinsweit definierte Ausstattungsmerkmale für Garagen.</CardDescription>
          </CardHeader>
          <CardContent>
            <GarageAttributeTypeManager
              initialItems={attributeTypes.map((t) => ({ id: t.id, name: t.name, dataType: t.dataType, unit: t.unit }))}
              canEdit={canEditAttributeTypes}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rechnungsvorlagen">
        <Card>
          <CardHeader>
            <CardTitle>Rechnungsposten-Typen</CardTitle>
            <CardDescription>Wiederverwendbare Rechnungsposten (z. B. Mitgliedsbeitrag, Kaution Arbeitseinsatz).</CardDescription>
          </CardHeader>
          <CardContent>
            <LineItemTypeManager
              initialItems={lineItemTypes.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                amountSource: t.amountSource,
                defaultAmount: t.defaultAmount,
              }))}
              canEdit={canEditInvoiceTemplates}
            />
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Rechnungsvorlagen</CardTitle>
            <CardDescription>
              Ordnen Sie Rechnungsposten-Typen einer Rechnungsart zu — automatisch angewendet bei der Rechnungserstellung, oder als
              Vorbelegung wählbar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceTemplateManager
              initialItems={invoiceTemplates.map((template) => ({
                id: template.id,
                name: template.name,
                invoiceType: template.invoiceType as 'membershipFee' | 'custom',
                autoGenerate: template.autoGenerate,
                lineItems: invoiceTemplateLineItems
                  .filter((li) => li.invoiceTemplateId === template.id)
                  .map((li) => ({
                    lineItemTypeId: li.lineItemTypeId,
                    quantity: li.quantity.toString(),
                    overrideAmountEuro: li.overrideAmount != null ? (li.overrideAmount / 100).toString() : '',
                  })),
              }))}
              lineItemTypes={lineItemTypes.map((t) => ({ id: t.id, name: t.name }))}
              canEdit={canEditInvoiceTemplates}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
