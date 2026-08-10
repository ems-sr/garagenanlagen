'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createEmailTemplate as createEmailTemplateAction,
  updateEmailTemplate as updateEmailTemplateAction,
  deleteEmailTemplate as deleteEmailTemplateAction,
} from '@/app/(app)/_actions/email-templates';
import { createEmailTemplateSchema } from '@/lib/validation/email-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

type EmailTemplate = { id: string; name: string; subject: string; body: string };

type FormValues = { name: string; subject: string; body: string };

const emptyForm: FormValues = { name: '', subject: '', body: '' };

function EmailTemplateFormDialog({
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

    const result = createEmailTemplateSchema.safeParse(values.value);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.value.name}>
              <FieldLabel htmlFor="templateName">Name</FieldLabel>
              <Input
                id="templateName"
                placeholder="z. B. Zahlungserinnerung"
                value={values.value.name}
                onChange={(e) => setField('name', e.target.value)}
                aria-invalid={!!errors.value.name}
              />
              {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
            </Field>
            <Field data-invalid={!!errors.value.subject}>
              <FieldLabel htmlFor="templateSubject">Betreff</FieldLabel>
              <Input
                id="templateSubject"
                value={values.value.subject}
                onChange={(e) => setField('subject', e.target.value)}
                aria-invalid={!!errors.value.subject}
              />
              {errors.value.subject && <FieldError errors={[{ message: errors.value.subject }]} />}
            </Field>
            <Field data-invalid={!!errors.value.body}>
              <FieldLabel htmlFor="templateBody">Text</FieldLabel>
              <Textarea
                id="templateBody"
                rows={6}
                placeholder="Hallo {{firstName}} {{lastName}}, ..."
                value={values.value.body}
                onChange={(e) => setField('body', e.target.value)}
                aria-invalid={!!errors.value.body}
              />
              <p className="text-xs text-muted-foreground">
                Platzhalter: <code>{'{{firstName}}'}</code>, <code>{'{{lastName}}'}</code>, <code>{'{{email}}'}</code>
              </p>
              {errors.value.body && <FieldError errors={[{ message: errors.value.body }]} />}
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

export function EmailTemplateManager({ initialItems, canEdit }: { initialItems: EmailTemplate[]; canEdit: boolean }) {
  useSignals();
  const router = useRouter();

  async function createTemplate(values: FormValues): Promise<boolean> {
    const result = await createEmailTemplateAction(values);
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Vorlage angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateTemplate(id: string, values: FormValues): Promise<boolean> {
    const result = await updateEmailTemplateAction(id, values);
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Vorlage aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteTemplate(id: string) {
    const result = await deleteEmailTemplateAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Vorlage gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <EmailTemplateFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Neue Vorlage
              </Button>
            }
            title="Vorlage anlegen"
            initialValues={emptyForm}
            onSubmit={createTemplate}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Betreff</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 3 : 2} className="text-center text-muted-foreground">
                Noch keine Vorlage erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.subject}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <EmailTemplateFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Vorlage bearbeiten"
                      initialValues={{ name: item.name, subject: item.subject, body: item.body }}
                      onSubmit={(values) => updateTemplate(item.id, values)}
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
                          <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTemplate(item.id)}>Löschen</AlertDialogAction>
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
