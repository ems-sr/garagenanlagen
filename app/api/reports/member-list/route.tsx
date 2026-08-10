import { headers } from 'next/headers';
import { renderToBuffer } from '@react-pdf/renderer';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRequestContext } from '@/lib/api/context';
import { requirePermission } from '@/lib/api/permissions';
import { zodError } from '@/lib/api/responses';
import { memberListReportQuerySchema } from '@/lib/validation/reports';
import { assembleMemberListReport } from '@/lib/reports/member-list';
import { MemberListPdf } from '@/lib/pdf/member-list-pdf';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext();
  if ('error' in ctx) return ctx.error;
  const { organizationId } = ctx;

  const denied = await requirePermission(organizationId, { report: ['read'] });
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const parsed = memberListReportQuerySchema.safeParse({
    activeOnly: params.get('activeOnly') ?? undefined,
    facilityId: params.get('facilityId') ?? undefined,
  });
  if (!parsed.success) return zodError(parsed);

  const [data, organization] = await Promise.all([
    assembleMemberListReport(organizationId, parsed.data),
    auth.api.getFullOrganization({ headers: await headers(), query: { organizationId } }),
  ]);

  const buffer = await renderToBuffer(
    <MemberListPdf data={data} organizationName={organization?.name} generatedAt={new Date()} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="mitgliederliste.pdf"',
    },
  });
}
