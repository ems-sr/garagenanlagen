'use client';

import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { signUpSchema } from '@/lib/validation/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

export default function SignUpPage() {
  // Manual opt-in tracking: no signals babel/swc transform is configured,
  // so components must subscribe themselves to re-render on `.value` reads.
  useSignals();
  const router = useRouter();
  const name = useSignal('');
  const email = useSignal('');
  const password = useSignal('');
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = signUpSchema.safeParse({ name: name.value, email: email.value, password: password.value });
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? ''])
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;

    const { error } = await authClient.signUp.email({
      name: result.data.name,
      email: result.data.email,
      password: result.data.password,
    });

    isSubmitting.value = false;

    if (error) {
      toast.add({ title: 'Registrierung fehlgeschlagen', description: error.message, type: 'error' });
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Konto erstellen</CardTitle>
          <CardDescription>Erstellen Sie ein neues Konto.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={!!errors.value.name}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  autoComplete="name"
                  aria-invalid={!!errors.value.name}
                  value={name.value}
                  onChange={(e) => (name.value = e.target.value)}
                />
                {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
              </Field>
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
                  autoComplete="new-password"
                  aria-invalid={!!errors.value.password}
                  value={password.value}
                  onChange={(e) => (password.value = e.target.value)}
                />
                {errors.value.password && <FieldError errors={[{ message: errors.value.password }]} />}
              </Field>
              <Button type="submit" disabled={isSubmitting.value}>
                Registrieren
              </Button>
            </FieldGroup>
          </form>
          <p className="text-muted-foreground mt-4 text-sm">
            Bereits ein Konto?{' '}
            <Link href="/sign-in" className="underline">
              Anmelden
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
