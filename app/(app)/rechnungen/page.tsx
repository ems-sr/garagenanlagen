import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { getSelectedFacilityId } from '@/lib/facility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceList } from '@/components/invoice-list';
import { FacilitySwitcher } from '@/components/facility-switcher';

export default async function RechnungenPage() {
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

  const facilityId = await getSelectedFacilityId();
  if (!facilityId) {
    const facilities = await db.orm.public.Facility.where({ organizationId }).all();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Garagenanlage ausgewählt</CardTitle>
          <CardDescription>Bitte wählen Sie zunächst eine Garagenanlage aus.</CardDescription>
        </CardHeader>
        <CardContent>
          <FacilitySwitcher
            facilities={facilities.map((facility) => ({ id: facility.id, name: facility.name }))}
            selectedFacilityId={undefined}
          />
        </CardContent>
      </Card>
    );
  }

  const [allInvoices, canGenerate] = await Promise.all([
    db.orm.public.Invoice.where({ organizationId }).orderBy((i) => i.issueDate.desc()).all(),
    auth.api
      .hasPermission({ headers: await headers(), body: { organizationId, permissions: { invoice: ['create'] } } })
      .then((result) => result.success),
  ]);
  // Consumption invoices are facility-scoped; membershipFee/custom invoices
  // are club-wide (no facilityId) and shown regardless of the selected
  // facility, per Stage 5's shared open-item tracking.
  const invoices = allInvoices.filter((invoice) => !invoice.facilityId || invoice.facilityId === facilityId);

  const [members, garages, customTemplates, customTemplateLineItems] = await Promise.all([
    db.orm.public.ClubMember.where({ organizationId }).all(),
    // Org-wide, not scoped to the selected facility: membershipFee invoices
    // are club-wide (see the invoices filter above) and can reference a
    // garage in any facility, so the garageId -> number lookup below must
    // cover every facility, not just the currently selected one.
    db.orm.public.Garage.where({ organizationId }).all(),
    db.orm.public.InvoiceTemplate.where({ organizationId, invoiceType: 'custom', autoGenerate: false }).all(),
    db.orm.public.InvoiceTemplateLineItem.where({ organizationId }).orderBy((li) => li.sortOrder.asc()).all(),
  ]);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const garageById = new Map(garages.map((garage) => [garage.id, garage]));

  const lineItemTypeIds = [...new Set(customTemplateLineItems.map((li) => li.lineItemTypeId))];
  const lineItemTypes =
    lineItemTypeIds.length > 0 ? await db.orm.public.LineItemType.where({ organizationId }).all() : [];
  const lineItemTypeById = new Map(lineItemTypes.map((type) => [type.id, type]));
  const customTemplateIds = new Set(customTemplates.map((t) => t.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechnungen</CardTitle>
        <CardDescription>Verbrauchs-, Beitrags- und sonstige Rechnungen für den Verein.</CardDescription>
      </CardHeader>
      <CardContent>
        <InvoiceList
          facilityId={facilityId}
          canGenerate={canGenerate}
          members={members.map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}` }))}
          prefillTemplates={customTemplates.map((template) => ({
            id: template.id,
            name: template.name,
            lineItems: customTemplateLineItems
              .filter((li) => li.invoiceTemplateId === template.id && customTemplateIds.has(li.invoiceTemplateId))
              .map((li) => {
                const lineItemType = lineItemTypeById.get(li.lineItemTypeId);
                const unitPrice = lineItemType?.amountSource === 'fixed' ? (li.overrideAmount ?? lineItemType.defaultAmount ?? null) : null;
                return {
                  description: lineItemType?.name ?? '',
                  quantity: li.quantity.toString(),
                  unitPrice,
                };
              }),
          }))}
          items={invoices.map((invoice) => {
            const member = memberById.get(invoice.clubMemberId);
            const garage = invoice.garageId ? garageById.get(invoice.garageId) : undefined;
            return {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              type: invoice.type,
              memberName: member ? `${member.firstName} ${member.lastName}` : '–',
              garageNumber: garage?.number ?? '–',
              periodStart: invoice.periodStart.toISOString(),
              periodEnd: invoice.periodEnd.toISOString(),
              consumptionKwh: invoice.consumptionKwh,
              grossAmount: invoice.grossAmount,
              status: invoice.status,
            };
          })}
        />
      </CardContent>
    </Card>
  );
}
