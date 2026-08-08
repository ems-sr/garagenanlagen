import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/prisma/db';
import { getSelectedFacilityId } from '@/lib/facility';
import { hasPermission } from '@/lib/api/permissions';
import { NAV_ITEMS, type NavItem } from '@/lib/nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/sign-in');
  }

  const organizationId = session.session.activeOrganizationId;
  const [facilities, selectedFacilityId, navItems, cookieStore] = await Promise.all([
    organizationId
      ? db.orm.public.Facility.where({ organizationId }).all()
      : Promise.resolve([]),
    getSelectedFacilityId(),
    resolveVisibleNavItems(organizationId),
    cookies(),
  ]);

  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar
        navItems={navItems}
        facilities={facilities}
        selectedFacilityId={selectedFacilityId}
        userEmail={session.user.email}
      />
      <SidebarInset>
        <AppTopbar />
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
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
