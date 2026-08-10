'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFourIcon,
  UsersIcon,
  GarageIcon,
  BuildingsIcon,
  ArrowsLeftRightIcon,
  ReceiptIcon,
  EnvelopeSimpleIcon,
  type Icon,
} from '@phosphor-icons/react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/lib/nav';

const NAV_ICONS: Record<string, Icon> = {
  '/dashboard': SquaresFourIcon,
  '/mitglieder': UsersIcon,
  '/garagenanlagen': GarageIcon,
  '/verein': BuildingsIcon,
  '/rechnungen': ReceiptIcon,
  '/korrespondenz': EnvelopeSimpleIcon,
  '/organizations': ArrowsLeftRightIcon,
};

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const ItemIcon = NAV_ICONS[item.href] ?? SquaresFourIcon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton render={<Link href={item.href} />} isActive={active} tooltip={item.label}>
                  <ItemIcon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
