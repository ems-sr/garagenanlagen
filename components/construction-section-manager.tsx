'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createConstructionSection as createConstructionSectionAction,
  updateConstructionSection as updateConstructionSectionAction,
  deleteConstructionSection as deleteConstructionSectionAction,
} from '@/app/(app)/_actions/construction-sections';
import { createConstructionSectionSchema } from '@/lib/validation/construction-section';
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

type ConstructionSection = { id: string; name: string };

type FormValues = { name: string };

const emptyForm: FormValues = { name: '' };

function ConstructionSectionFormDialog({
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createConstructionSectionSchema
      .omit({ facilityId: true })
      .safeParse({ name: values.value.name });
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
            <Field data-invalid={!!errors.value.name}>
              <FieldLabel htmlFor="sectionName">Name</FieldLabel>
              <Input
                id="sectionName"
                value={values.value.name}
                onChange={(e) => (values.value = { ...values.value, name: e.target.value })}
                aria-invalid={!!errors.value.name}
              />
              {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
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

export function ConstructionSectionManager({
  facilityId,
  initialItems,
  canEdit,
}: {
  facilityId: string;
  initialItems: ConstructionSection[];
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();

  async function createSection(values: FormValues): Promise<boolean> {
    const result = await createConstructionSectionAction({ facilityId, name: values.name });
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Bauabschnitt angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateSection(id: string, values: FormValues): Promise<boolean> {
    const result = await updateConstructionSectionAction(id, { name: values.name });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Bauabschnitt aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteSection(id: string) {
    const result = await deleteConstructionSectionAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Bauabschnitt gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <ConstructionSectionFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Neuer Bauabschnitt
              </Button>
            }
            title="Bauabschnitt anlegen"
            initialValues={emptyForm}
            onSubmit={createSection}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 2 : 1} className="text-center text-muted-foreground">
                Noch keine Bauabschnitte erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ConstructionSectionFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Bauabschnitt bearbeiten"
                      initialValues={{ name: item.name }}
                      onSubmit={(values) => updateSection(item.id, values)}
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
                          <AlertDialogTitle>Bauabschnitt löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSection(item.id)}>Löschen</AlertDialogAction>
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
