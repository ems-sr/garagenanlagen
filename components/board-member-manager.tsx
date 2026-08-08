'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createBoardMember as createBoardMemberAction,
  updateBoardMember as updateBoardMemberAction,
  deleteBoardMember as deleteBoardMemberAction,
} from '@/app/(app)/_actions/board-members';
import { createBoardMemberSchema } from '@/lib/validation/board-member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import { PlusIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

type BoardMember = {
  id: string;
  fullName: string;
  role: string;
  email: string | null;
  phone: string | null;
};

type FormValues = { fullName: string; role: string; email: string; phone: string };

const emptyForm: FormValues = { fullName: '', role: '', email: '', phone: '' };

function BoardMemberFormDialog({
  trigger,
  title,
  initialValues,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initialValues: FormValues;
  onSubmit: (values: FormValues) => Promise<boolean>;
}) {
  useSignals();
  const open = useSignal(false);
  const values = useSignal<FormValues>(initialValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    values.value = { ...values.value, [key]: value };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      fullName: values.value.fullName,
      role: values.value.role,
      email: values.value.email === '' ? undefined : values.value.email,
      phone: values.value.phone === '' ? undefined : values.value.phone,
    };
    const result = createBoardMemberSchema.safeParse(payload);
    if (!result.success) {
      errors.value = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? '']),
      );
      return;
    }
    errors.value = {};
    isSubmitting.value = true;
    const ok = await onSubmit(values.value);
    isSubmitting.value = false;

    if (ok) {
      open.value = false;
      values.value = emptyForm;
    }
  }

  return (
    <Dialog
      open={open.value}
      onOpenChange={(next) => {
        open.value = next;
        if (next) values.value = initialValues;
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.value.fullName}>
              <FieldLabel htmlFor="fullName">Name</FieldLabel>
              <Input
                id="fullName"
                value={values.value.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                aria-invalid={!!errors.value.fullName}
              />
              {errors.value.fullName && <FieldError errors={[{ message: errors.value.fullName }]} />}
            </Field>
            <Field data-invalid={!!errors.value.role}>
              <FieldLabel htmlFor="role">Funktion</FieldLabel>
              <Input
                id="role"
                placeholder="z. B. Vorsitzender"
                value={values.value.role}
                onChange={(e) => setField('role', e.target.value)}
                aria-invalid={!!errors.value.role}
              />
              {errors.value.role && <FieldError errors={[{ message: errors.value.role }]} />}
            </Field>
            <Field data-invalid={!!errors.value.email}>
              <FieldLabel htmlFor="email">E-Mail</FieldLabel>
              <Input
                id="email"
                type="email"
                value={values.value.email}
                onChange={(e) => setField('email', e.target.value)}
                aria-invalid={!!errors.value.email}
              />
              {errors.value.email && <FieldError errors={[{ message: errors.value.email }]} />}
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Telefon</FieldLabel>
              <Input id="phone" value={values.value.phone} onChange={(e) => setField('phone', e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting.value}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BoardMemberManager({ initialItems, canEdit }: { initialItems: BoardMember[]; canEdit: boolean }) {
  useSignals();
  const router = useRouter();

  async function createBoardMember(values: FormValues): Promise<boolean> {
    const result = await createBoardMemberAction({
      fullName: values.fullName,
      role: values.role,
      email: values.email || undefined,
      phone: values.phone || undefined,
    });
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Vorstandsmitglied angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateBoardMember(id: string, values: FormValues): Promise<boolean> {
    const result = await updateBoardMemberAction(id, {
      fullName: values.fullName,
      role: values.role,
      email: values.email || undefined,
      phone: values.phone || undefined,
    });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Vorstandsmitglied aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteBoardMember(id: string) {
    const result = await deleteBoardMemberAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Vorstandsmitglied gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <BoardMemberFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Neues Vorstandsmitglied
              </Button>
            }
            title="Vorstandsmitglied anlegen"
            initialValues={emptyForm}
            onSubmit={createBoardMember}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Funktion</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Telefon</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">
                Noch keine Vorstandsmitglieder erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.fullName}</TableCell>
              <TableCell>{item.role}</TableCell>
              <TableCell>{item.email ?? '–'}</TableCell>
              <TableCell>{item.phone ?? '–'}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <BoardMemberFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Vorstandsmitglied bearbeiten"
                      initialValues={{
                        fullName: item.fullName,
                        role: item.role,
                        email: item.email ?? '',
                        phone: item.phone ?? '',
                      }}
                      onSubmit={(values) => updateBoardMember(item.id, values)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button size="icon-sm" variant="ghost">
                            <TrashIcon />
                            <span className="sr-only">Löschen</span>
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Vorstandsmitglied löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteBoardMember(item.id)}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
