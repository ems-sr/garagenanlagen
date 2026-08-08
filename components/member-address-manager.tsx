'use client';

import { useRouter } from 'next/navigation';
import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  createMemberAddress as createMemberAddressAction,
  updateMemberAddress as updateMemberAddressAction,
  deleteMemberAddress as deleteMemberAddressAction,
} from '@/app/(app)/_actions/member-addresses';
import { createMemberAddressSchema } from '@/lib/validation/member-address';
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

type AddressType = 'home' | 'billing' | 'other';

type Address = {
  id: string;
  type: AddressType;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
};

type FormValues = { type: AddressType; street: string; houseNumber: string; postalCode: string; city: string };

const emptyForm: FormValues = { type: 'home', street: '', houseNumber: '', postalCode: '', city: '' };

const typeLabels: Record<AddressType, string> = {
  home: 'Hauptadresse',
  billing: 'Rechnungsadresse',
  other: 'Sonstige',
};

function AddressFormDialog({
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
      type: values.value.type,
      street: values.value.street === '' ? undefined : values.value.street,
      houseNumber: values.value.houseNumber === '' ? undefined : values.value.houseNumber,
      postalCode: values.value.postalCode === '' ? undefined : values.value.postalCode,
      city: values.value.city === '' ? undefined : values.value.city,
    };
    const result = createMemberAddressSchema.safeParse(payload);
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
              <FieldLabel htmlFor="addressType">Art</FieldLabel>
              <Select value={values.value.type} onValueChange={(value) => setField('type', value as AddressType)}>
                <SelectTrigger id="addressType">
                  <SelectValue placeholder="Art wählen">
                    {(value: AddressType | null) => (value ? typeLabels[value] : 'Art wählen')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(typeLabels) as AddressType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {typeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.value.type && <FieldError errors={[{ message: errors.value.type }]} />}
            </Field>
            <Field orientation="responsive" data-invalid={!!errors.value.street || !!errors.value.houseNumber}>
              <FieldLabel htmlFor="addressStreet">Straße</FieldLabel>
              <Input id="addressStreet" value={values.value.street} onChange={(e) => setField('street', e.target.value)} />
              {errors.value.street && <FieldError errors={[{ message: errors.value.street }]} />}
            </Field>
            <Field data-invalid={!!errors.value.houseNumber}>
              <FieldLabel htmlFor="addressHouseNumber">Hausnummer</FieldLabel>
              <Input
                id="addressHouseNumber"
                value={values.value.houseNumber}
                onChange={(e) => setField('houseNumber', e.target.value)}
              />
              {errors.value.houseNumber && <FieldError errors={[{ message: errors.value.houseNumber }]} />}
            </Field>
            <Field orientation="responsive" data-invalid={!!errors.value.postalCode}>
              <FieldLabel htmlFor="addressPostalCode">PLZ</FieldLabel>
              <Input
                id="addressPostalCode"
                value={values.value.postalCode}
                onChange={(e) => setField('postalCode', e.target.value)}
              />
            </Field>
            <Field data-invalid={!!errors.value.city}>
              <FieldLabel htmlFor="addressCity">Ort</FieldLabel>
              <Input id="addressCity" value={values.value.city} onChange={(e) => setField('city', e.target.value)} />
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

export function MemberAddressManager({ memberId, initialItems }: { memberId: string; initialItems: Address[] }) {
  useSignals();
  const router = useRouter();

  async function createAddress(values: FormValues): Promise<boolean> {
    const result = await createMemberAddressAction(memberId, {
      type: values.type,
      street: values.street || undefined,
      houseNumber: values.houseNumber || undefined,
      postalCode: values.postalCode || undefined,
      city: values.city || undefined,
    });
    if (!result.success) {
      toast.add({ title: 'Anlegen fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Adresse angelegt', type: 'success' });
    router.refresh();
    return true;
  }

  async function updateAddress(id: string, values: FormValues): Promise<boolean> {
    const result = await updateMemberAddressAction(memberId, id, {
      type: values.type,
      street: values.street || undefined,
      houseNumber: values.houseNumber || undefined,
      postalCode: values.postalCode || undefined,
      city: values.city || undefined,
    });
    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return false;
    }
    toast.add({ title: 'Adresse aktualisiert', type: 'success' });
    router.refresh();
    return true;
  }

  async function deleteAddress(id: string) {
    const result = await deleteMemberAddressAction(memberId, id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Adresse gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddressFormDialog
          trigger={
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              Adresse hinzufügen
            </Button>
          }
          title="Adresse hinzufügen"
          initialValues={emptyForm}
          onSubmit={createAddress}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Art</TableHead>
            <TableHead>Straße</TableHead>
            <TableHead>PLZ</TableHead>
            <TableHead>Ort</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Keine weiteren Adressen erfasst.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{typeLabels[item.type]}</TableCell>
              <TableCell>{item.street || item.houseNumber ? `${item.street ?? ''} ${item.houseNumber ?? ''}`.trim() : '–'}</TableCell>
              <TableCell>{item.postalCode ?? '–'}</TableCell>
              <TableCell>{item.city ?? '–'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <AddressFormDialog
                    trigger={
                      <Button size="icon-sm" variant="ghost">
                        <PencilSimpleIcon />
                        <span className="sr-only">Bearbeiten</span>
                      </Button>
                    }
                    title="Adresse bearbeiten"
                    initialValues={{
                      type: item.type,
                      street: item.street ?? '',
                      houseNumber: item.houseNumber ?? '',
                      postalCode: item.postalCode ?? '',
                      city: item.city ?? '',
                    }}
                    onSubmit={(values) => updateAddress(item.id, values)}
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
                        <AlertDialogTitle>Adresse löschen?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAddress(item.id)}>Löschen</AlertDialogAction>
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
