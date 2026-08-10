import { headers } from 'next/headers';
import { renderToBuffer } from '@react-pdf/renderer';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { financialReportQuerySchema } from '@/lib/validation/reports';
import { assembleFinancialReport } from '@/lib/reports/financial-report';
import { FinancialReportPdf } from '@/lib/pdf/financial-report-pdf';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { report: ['read'] });
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const parsed = financialReportQuerySchema.safeParse({
    dateFrom: params.get('dateFrom') ?? undefined,
    dateTo: params.get('dateTo') ?? undefined,
    facilityId: params.get('facilityId') ?? undefined,
  });
  if (!parsed.success) return zodError(parsed);

  const [data, organization] = await Promise.all([
    assembleFinancialReport(organizationId, parsed.data),
    auth.api.getFullOrganization({ headers: await headers(), query: { organizationId } }),
  ]);

  const buffer = await renderToBuffer(
    <FinancialReportPdf data={data} organizationName={organization?.name} generatedAt={new Date()} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="finanzbericht.pdf"',
    },
  });
}
