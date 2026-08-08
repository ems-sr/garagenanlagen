'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createBlock as createBlockAction,
  updateBlock as updateBlockAction,
  deleteBlock as deleteBlockAction,
} from '@/app/(app)/_actions/blocks';
import { createBlockSchema } from '@/lib/validation/block';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type Block = { id: string; name: string; constructionSectionId: string | null };

type ConstructionSectionOption = { id: string; name: string };

type FormValues = { name: string; constructionSectionId: string | undefined };

const NONE = '__none__';

function emptyForm(): FormValues {
  return { name: '', constructionSectionId: undefined };
}

function BlockFormDialog({
  trigger,
  title,
  initialValues,
  constructionSections,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initialValues: FormValues;
  constructionSections: ConstructionSectionOption[];
  onSubmit: (values: FormValues) => Promise<boolean>;
}) {
  useSignals();
  const open = useSignal(false);
  const values = useSignal<FormValues>(initialValues);
  const errors = useSignal<Record<string, string>>({});
  const isSubmitting = useSignal(false);
  const sectionNameById = new Map(constructionSections.map((section) => [section.id, section.name]));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createBlockSchema.omit({ facilityId: true }).safeParse({
      name: values.value.name,
      constructionSectionId: values.value.constructionSectionId,
    });
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
      values.value = emptyForm();
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
              <FieldLabel htmlFor="blockName">Name</FieldLabel>
              <Input
                id="blockName"
                value={values.value.name}
                onChange={(e) => (values.value = { ...values.value, name: e.target.value })}
                aria-invalid={!!errors.value.name}
              />
              {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
            </Field>
            <Field>
              <FieldLabel htmlFor="blockSection">Bauabschnitt</FieldLabel>
              <Select
                value={values.value.constructionSectionId ?? NONE}
                onValueChange={(value) =>
                  (values.value = { ...values.value, constructionSectionId: !value || value === NONE ? undefined : value })
                }
              >
                <SelectTrigger id="blockSection">
                  <SelectValue placeholder="Kein Bauabschnitt">
                    {(value: string | null) =>
                      !value || value === NONE ? 'Kein Bauabschnitt' : (sectionNameById.get(value) ?? value)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NONE}>Kein Bauabschnitt</SelectItem>
                    {constructionSections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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

export function BlockManager({
  facilityId,
  initialItems,
  constructionSections,
  canEdit,
}: {
  facilityId: string;
  initialItems: Block[];
  constructionSections: ConstructionSectionOption[];
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();
  const sectionNameById = new Map(constructionSections.map((section) => [section.id, section.name]));

  async function createBlock(values: FormValues): Promise<boolean> {
    const result = await createBlockAction({
      facilityId,
      name: values.name,
      constructionSectionId: values.constructionSectionId,
    });
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Trakt angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateBlock(id: string, values: FormValues): Promise<boolean> {
    const result = await updateBlockAction(id, {
      name: values.name,
      constructionSectionId: values.constructionSectionId,
    });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Trakt aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteBlock(id: string) {
    const result = await deleteBlockAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Trakt gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <BlockFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Neuer Trakt
              </Button>
            }
            title="Trakt anlegen"
            initialValues={emptyForm()}
            constructionSections={constructionSections}
            onSubmit={createBlock}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Bauabschnitt</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 3 : 2} className="text-center text-muted-foreground">
                Noch keine Trakte erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>
                {item.constructionSectionId ? (sectionNameById.get(item.constructionSectionId) ?? '–') : '–'}
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <BlockFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Trakt bearbeiten"
                      initialValues={{ name: item.name, constructionSectionId: item.constructionSectionId ?? undefined }}
                      constructionSections={constructionSections}
                      onSubmit={(values) => updateBlock(item.id, values)}
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
                          <AlertDialogTitle>Trakt löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteBlock(item.id)}>Löschen</AlertDialogAction>
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
