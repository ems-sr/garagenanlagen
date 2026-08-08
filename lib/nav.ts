export type NavItem = {
  href: string;
  label: string;
  // When set, the item is only shown if the active organization grants at
  // least one of the listed actions on the resource. Items without a
  // permission are always shown to an authenticated user.
  permission?: { resource: string; actions: string[] };
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/mitglieder', label: 'Mitglieder', permission: { resource: 'member', actions: ['read'] } },
  { href: '/verein', label: 'Verein', permission: { resource: 'club', actions: ['read'] } },
  { href: '/organizations', label: 'Verein wechseln' },
];
