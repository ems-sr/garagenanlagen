import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { getSelectedFacilityId } from '@/lib/facility';
import { hasPermission } from '@/lib/api/permissions';
import { NAV_ITEMS, type NavItem } from '@/lib/nav';
import { Separator } from '@/components/ui/separator';
import { FacilitySwitcher } from '@/components/facility-switcher';
import { AppNav } from '@/components/app-nav';
import { SignOutButton } from '@/components/sign-out-button';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/sign-in');
  }

  const organizationId = session.session.activeOrganizationId;
  const [facilities, selectedFacilityId, navItems] = await Promise.all([
    organizationId
      ? db.orm.public.Facility.where({ organizationId }).all()
      : Promise.resolve([]),
    getSelectedFacilityId(),
    resolveVisibleNavItems(organizationId),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b p-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-semibold">
            Garagenverwaltung
          </Link>
          <FacilitySwitcher facilities={facilities} selectedFacilityId={selectedFacilityId} />
          <AppNav items={navItems} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <Separator />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}

// Items without a `permission` are always shown; items with one require an
// active organization that grants at least the listed actions.
async function resolveVisibleNavItems(organizationId: string | null | undefined): Promise<NavItem[]> {
  const checks = await Promise.all(
    NAV_ITEMS.map(async (item) => {
      if (!item.permission) return item;
      if (!organizationId) return null;
      const allowed = await hasPermission(organizationId, { [item.permission.resource]: item.permission.actions });
      return allowed ? item : null;
    }),
  );
  return checks.filter((item): item is NavItem => item !== null);
}
