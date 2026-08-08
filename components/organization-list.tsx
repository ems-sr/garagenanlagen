'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

type Organization = {
  id: string;
  name: string;
};

export function OrganizationList({
  organizations,
  activeOrganizationId,
}: {
  organizations: Organization[];
  activeOrganizationId?: string;
}) {
  const router = useRouter();

  if (organizations.length === 0) {
    return <p className="text-muted-foreground">Sie sind noch keinem Verein zugeordnet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {organizations.map((org) => (
        <li key={org.id} className="flex items-center justify-between gap-2">
          <span>{org.name}</span>
          {org.id === activeOrganizationId ? (
            <span className="text-muted-foreground text-sm">Aktiv</span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await authClient.organization.setActive({ organizationId: org.id });
                router.push('/dashboard');
                router.refresh();
              }}
            >
              Auswählen
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
