'use client';

import Link from 'next/link';
import { GarageIcon } from '@phosphor-icons/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { AppNav } from '@/components/app-nav';
import { NavUser } from '@/components/nav-user';
import { FacilitySwitcher } from '@/components/facility-switcher';
import type { NavItem } from '@/lib/nav';

type Facility = { id: string; name: string };

export function AppSidebar({
  navItems,
  facilities,
  selectedFacilityId,
  userEmail,
}: {
  navItems: NavItem[];
  facilities: Facility[];
  selectedFacilityId: string | undefined;
  userEmail: string;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GarageIcon className="size-5" />
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Garagenverwaltung</span>
          </div>
        </Link>
        <div className="group-data-[collapsible=icon]:hidden">
          <FacilitySwitcher facilities={facilities} selectedFacilityId={selectedFacilityId} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <AppNav items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={userEmail} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
