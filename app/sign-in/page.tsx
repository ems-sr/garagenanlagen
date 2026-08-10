'use client';

import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { signInSchema } from '@/lib/validation/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

export default function SignInPage() {
  // Manual opt-in tracking: no signals babel/swc transform is configured,
  // so components must subscribe themselves to re-render on `.value` reads.
  useSignals();
  const router = useRouter();
  const email = useSignal('');
  const password = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = signInSchema.safeParse({ email: email.value, password: password.value });
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? ''])
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const { error } = await authClient.signIn.email({
      email: result.data.email,
      password: result.data.password,
    });

    isSubmitting.value = false;

    if (error) {
      toast.add({ title: 'Anmeldung fehlgeschlagen', description: error.message, type: 'error' });
      return;
    }

    const { data: organizations } = await authClient.organization.list();
    if (organizations?.length === 1) {
      await authClient.organization.setActive({ organizationId: organizations[0].id });
    }

    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Anmelden</CardTitle>
          <CardDescription>Melden Sie sich mit Ihrer E-Mail-Adresse an.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={!!errors.value.email}>
                <FieldLabel htmlFor="email">E-Mail</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.value.email}
                  value={email.value}
                  onChange={(e) => (email.value = e.target.value)}
                />
                {errors.value.email && <FieldError errors={[{ message: errors.value.email }]} />}
              </Field>
              <Field data-invalid={!!errors.value.password}>
                <FieldLabel htmlFor="password">Passwort</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.value.password}
                  value={password.value}
                  onChange={(e) => (password.value = e.target.value)}
                />
                {errors.value.password && <FieldError errors={[{ message: errors.value.password }]} />}
              </Field>
              <Button type="submit" disabled={isSubmitting.value}>
                Anmelden
              </Button>
            </FieldGroup>
          </form>
          <p className="text-muted-foreground mt-4 text-sm">
            Noch kein Konto?{' '}
            <Link href="/sign-up" className="underline">
              Registrieren
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
