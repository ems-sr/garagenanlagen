import { headers } from 'next/headers';
import { renderToBuffer } from '@react-pdf/renderer';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { invoiceRunReportQuerySchema } from '@/lib/validation/reports';
import { assembleInvoiceRunReport } from '@/lib/reports/invoice-run';
import { InvoiceRunPdf } from '@/lib/pdf/invoice-run-pdf';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { report: ['read'] });
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const parsed = invoiceRunReportQuerySchema.safeParse({
    dateFrom: params.get('dateFrom') ?? undefined,
    dateTo: params.get('dateTo') ?? undefined,
    facilityId: params.get('facilityId') ?? undefined,
    type: params.get('type') ?? undefined,
  });
  if (!parsed.success) return zodError(parsed);

  const [data, organization] = await Promise.all([
    assembleInvoiceRunReport(organizationId, parsed.data),
    auth.api.getFullOrganization({ headers: await headers(), query: { organizationId } }),
  ]);

  const buffer = await renderToBuffer(
    <InvoiceRunPdf data={data} organizationName={organization?.name} generatedAt={new Date()} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="rechnungslauf.pdf"',
    },
  });
}
