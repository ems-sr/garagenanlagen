import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { getSelectedFacilityId } from '@/lib/facility';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FacilitySwitcher } from '@/components/facility-switcher';
import { SignOutButton } from '@/components/sign-out-button';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/sign-in');
  }

  const organizationId = session.session.activeOrganizationId;
  const [facilities, selectedFacilityId] = await Promise.all([
    organizationId
      ? db.orm.public.Facility.where({ organizationId }).all()
      : Promise.resolve([]),
    getSelectedFacilityId(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b p-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-semibold">
            Garagenverwaltung
          </Link>
          <FacilitySwitcher facilities={facilities} selectedFacilityId={selectedFacilityId} />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/organizations" className="text-sm">
            <Button variant="ghost" size="sm">
              Verein wechseln
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <Separator />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
