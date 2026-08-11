'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createAttributeType as createAttributeTypeAction,
  updateAttributeType as updateAttributeTypeAction,
  deleteAttributeType as deleteAttributeTypeAction,
} from '@/app/(app)/_actions/garage-attribute-types';
import { createAttributeTypeSchema } from '@/lib/validation/garage-attribute';
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

export type GarageAttributeDataType = 'text' | 'number' | 'boolean';

export const DATA_TYPE_LABELS: Record<GarageAttributeDataType, string> = {
  text: 'Text',
  number: 'Zahl',
  boolean: 'Ja/Nein',
};

type AttributeType = {
  id: string;
  name: string;
  dataType: GarageAttributeDataType;
  unit: string | null;
};

type FormValues = { name: string; dataType: GarageAttributeDataType; unit: string };

const emptyForm: FormValues = { name: '', dataType: 'text', unit: '' };

function AttributeTypeFormDialog({
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
      name: values.value.name,
      dataType: values.value.dataType,
      unit: values.value.unit === '' ? undefined : values.value.unit,
    };
    const result = createAttributeTypeSchema.safeParse(payload);
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
              <FieldLabel htmlFor="attributeName">Name</FieldLabel>
              <Input
                id="attributeName"
                placeholder="z. B. Rolltorantrieb"
                value={values.value.name}
                onChange={(e) => setField('name', e.target.value)}
                aria-invalid={!!errors.value.name}
              />
              {errors.value.name && <FieldError errors={[{ message: errors.value.name }]} />}
            </Field>
            <Field>
              <FieldLabel htmlFor="attributeDataType">Datentyp</FieldLabel>
              <Select value={values.value.dataType} onValueChange={(value) => setField('dataType', value as GarageAttributeDataType)}>
                <SelectTrigger id="attributeDataType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(DATA_TYPE_LABELS) as GarageAttributeDataType[]).map((dataType) => (
                      <SelectItem key={dataType} value={dataType}>
                        {DATA_TYPE_LABELS[dataType]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!errors.value.unit}>
              <FieldLabel htmlFor="attributeUnit">Einheit (optional)</FieldLabel>
              <Input
                id="attributeUnit"
                placeholder="z. B. cm, kg"
                value={values.value.unit}
                onChange={(e) => setField('unit', e.target.value)}
              />
              {errors.value.unit && <FieldError errors={[{ message: errors.value.unit }]} />}
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

export function GarageAttributeTypeManager({ initialItems, canEdit }: { initialItems: AttributeType[]; canEdit: boolean }) {
  useSignals();
  const router = useRouter();

  async function createAttributeType(values: FormValues): Promise<boolean> {
    const result = await createAttributeTypeAction({
      name: values.name,
      dataType: values.dataType,
      unit: values.unit || undefined,
    });
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Attributtyp angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateAttributeType(id: string, values: FormValues): Promise<boolean> {
    const result = await updateAttributeTypeAction(id, {
      name: values.name,
      dataType: values.dataType,
      unit: values.unit || undefined,
    });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Attributtyp aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteAttributeType(id: string) {
    const result = await deleteAttributeTypeAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Attributtyp gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <AttributeTypeFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Attributtyp anlegen
              </Button>
            }
            title="Attributtyp anlegen"
            initialValues={emptyForm}
            onSubmit={createAttributeType}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Datentyp</TableHead>
            <TableHead>Einheit</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground">
                Noch kein Attributtyp erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{DATA_TYPE_LABELS[item.dataType]}</TableCell>
              <TableCell>{item.unit ?? '–'}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <AttributeTypeFormDialog
                      trigger={
                        <Button size="icon-sm" variant="ghost">
                          <PencilSimpleIcon />
                          <span className="sr-only">Bearbeiten</span>
                        </Button>
                      }
                      title="Attributtyp bearbeiten"
                      initialValues={{ name: item.name, dataType: item.dataType, unit: item.unit ?? '' }}
                      onSubmit={(values) => updateAttributeType(item.id, values)}
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
                          <AlertDialogTitle>Attributtyp löschen?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteAttributeType(item.id)}>Löschen</AlertDialogAction>
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
