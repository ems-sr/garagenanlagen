'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createMemberContact as createMemberContactAction,
  updateMemberContact as updateMemberContactAction,
  deleteMemberContact as deleteMemberContactAction,
} from '@/app/(app)/_actions/member-contacts';
import { createMemberContactSchema } from '@/lib/validation/member-contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type ContactType = 'email' | 'phone' | 'mobile' | 'fax' | 'other';

type Contact = { id: string; type: ContactType; value: string };

type FormValues = { type: ContactType; value: string };

const emptyForm: FormValues = { type: 'email', value: '' };

const typeLabels: Record<ContactType, string> = {
  email: 'E-Mail',
  phone: 'Telefon',
  mobile: 'Mobil',
  fax: 'Fax',
  other: 'Sonstige',
};

function ContactFormDialog({
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

    const result = createMemberContactSchema.safeParse(values.value);
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
            <Field data-invalid={!!errors.value.type}>
              <FieldLabel htmlFor="contactType">Art</FieldLabel>
              <Select value={values.value.type} onValueChange={(value) => setField('type', value as ContactType)}>
                <SelectTrigger id="contactType">
                  <SelectValue placeholder="Art wählen">
                    {(value: ContactType | null) => (value ? typeLabels[value] : 'Art wählen')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(typeLabels) as ContactType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {typeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.value.type && <FieldError errors={[{ message: errors.value.type }]} />}
            </Field>
            <Field data-invalid={!!errors.value.value}>
              <FieldLabel htmlFor="contactValue">Wert</FieldLabel>
              <Input id="contactValue" value={values.value.value} onChange={(e) => setField('value', e.target.value)} />
              {errors.value.value && <FieldError errors={[{ message: errors.value.value }]} />}
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

export function MemberContactManager({ memberId, initialItems }: { memberId: string; initialItems: Contact[] }) {
  useSignals();
  const router = useRouter();

  async function createContact(values: FormValues): Promise<boolean> {
    const result = await createMemberContactAction(memberId, values);
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Kontakt angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateContact(id: string, values: FormValues): Promise<boolean> {
    const result = await updateMemberContactAction(memberId, id, values);
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Kontakt aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteContact(id: string) {
    const result = await deleteMemberContactAction(memberId, id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Kontakt gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ContactFormDialog
          trigger={
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              Kontakt hinzufügen
            </Button>
          }
          title="Kontakt hinzufügen"
          initialValues={emptyForm}
          onSubmit={createContact}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Art</TableHead>
            <TableHead>Wert</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Keine weiteren Kontakte erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{typeLabels[item.type]}</TableCell>
              <TableCell>{item.value}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <ContactFormDialog
                    trigger={
                      <Button size="icon-sm" variant="ghost">
                        <PencilSimpleIcon />
                        <span className="sr-only">Bearbeiten</span>
                      </Button>
                    }
                    title="Kontakt bearbeiten"
                    initialValues={{ type: item.type, value: item.value }}
                    onSubmit={(values) => updateContact(item.id, values)}
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
                        <AlertDialogTitle>Kontakt löschen?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteContact(item.id)}>Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
