'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSignal, type Signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { uploadDocumentAction, updateDocumentAction, deleteDocumentAction } from '@/app/(app)/_actions/documents';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { PlusIcon, DownloadSimpleIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

const NONE = 'none';

type DocumentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  clubMemberId: string | null;
  facilityId: string | null;
  createdAt: string;
};

type TagValues = { clubMemberId: string; facilityId: string; description: string };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-DE');
}

// Shared member/facility/description fields used by both the upload dialog
// (plus a file input) and the metadata-only edit dialog — content/fileName/
// mimeType/fileSize are immutable after upload (see the Document model
// comment in prisma/contract.prisma), so editing never touches the file.
function TagFields({
  values,
  members,
  facilities,
  idPrefix,
}: {
  values: Signal<TagValues>;
  members: { id: string; name: string }[];
  facilities: { id: string; name: string }[];
  idPrefix: string;
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}Member`}>Mitglied (optional)</FieldLabel>
        <Select
          value={values.value.clubMemberId}
          onValueChange={(value) => (values.value = { ...values.value, clubMemberId: value ?? NONE })}
        >
          <SelectTrigger id={`${idPrefix}Member`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NONE}>Kein Mitglied</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}Facility`}>Garagenanlage (optional)</FieldLabel>
        <Select
          value={values.value.facilityId}
          onValueChange={(value) => (values.value = { ...values.value, facilityId: value ?? NONE })}
        >
          <SelectTrigger id={`${idPrefix}Facility`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NONE}>Keine Garagenanlage</SelectItem>
              {facilities.map((facility) => (
                <SelectItem key={facility.id} value={facility.id}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}Description`}>Beschreibung (optional)</FieldLabel>
        <Textarea
          id={`${idPrefix}Description`}
          rows={3}
          value={values.value.description}
          onChange={(e) => (values.value = { ...values.value, description: e.target.value })}
        />
      </Field>
    </>
  );
}

function UploadDocumentDialog({
  members,
  facilities,
  onUploaded,
}: {
  members: { id: string; name: string }[];
  facilities: { id: string; name: string }[];
  onUploaded: () => void;
}) {
  useSignals();
  const open = useSignal(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const values = useSignal<TagValues>({ clubMemberId: NONE, facilityId: NONE, description: '' });
  const isSubmitting = useSignal(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.add({ title: 'Datei erforderlich', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.set('file', file);
    if (values.value.clubMemberId !== NONE) formData.set('clubMemberId', values.value.clubMemberId);
    if (values.value.facilityId !== NONE) formData.set('facilityId', values.value.facilityId);
    if (values.value.description) formData.set('description', values.value.description);

    isSubmitting.value = true;
    const result = await uploadDocumentAction(formData);
    isSubmitting.value = false;

    if (!result.success) {
      toast.add({ title: 'Upload fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Dokument hochgeladen', type: 'success' });
    open.value = false;
    values.value = { clubMemberId: NONE, facilityId: NONE, description: '' };
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploaded();
  }

  return (
    <Dialog open={open.value} onOpenChange={(next) => (open.value = next)}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon data-icon="inline-start" />
            Dokument hochladen
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dokument hochladen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="documentFile">Datei</FieldLabel>
              <input id="documentFile" ref={fileInputRef} type="file" className="text-sm" />
            </Field>
            <TagFields values={values} members={members} facilities={facilities} idPrefix="documentUpload" />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting.value}>
              Hochladen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDocumentDialog({
  item,
  members,
  facilities,
  onSaved,
}: {
  item: DocumentItem;
  members: { id: string; name: string }[];
  facilities: { id: string; name: string }[];
  onSaved: () => void;
}) {
  useSignals();
  const open = useSignal(false);
  const values = useSignal<TagValues>({
    clubMemberId: item.clubMemberId ?? NONE,
    facilityId: item.facilityId ?? NONE,
    description: item.description ?? '',
  });
  const isSubmitting = useSignal(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    isSubmitting.value = true;
    const result = await updateDocumentAction(item.id, {
      clubMemberId: values.value.clubMemberId === NONE ? null : values.value.clubMemberId,
      facilityId: values.value.facilityId === NONE ? null : values.value.facilityId,
      description: values.value.description || null,
    });
    isSubmitting.value = false;

    if (!result.success) {
      toast.add({ title: 'Speichern fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }

    toast.add({ title: 'Dokument aktualisiert', type: 'success' });
    open.value = false;
    onSaved();
  }

  return (
    <Dialog
      open={open.value}
      onOpenChange={(next) => {
        open.value = next;
        if (next) values.value = { clubMemberId: item.clubMemberId ?? NONE, facilityId: item.facilityId ?? NONE, description: item.description ?? '' };
      }}
    >
      <DialogTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <PencilSimpleIcon />
            <span className="sr-only">Bearbeiten</span>
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dokument bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <TagFields values={values} members={members} facilities={facilities} idPrefix="documentEdit" />
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

export function DocumentManager({
  initialItems,
  members,
  facilities,
  canEdit,
}: {
  initialItems: DocumentItem[];
  members: { id: string; name: string }[];
  facilities: { id: string; name: string }[];
  canEdit: boolean;
}) {
  useSignals();
  const router = useRouter();

  const memberById = new Map(members.map((member) => [member.id, member.name]));
  const facilityById = new Map(facilities.map((facility) => [facility.id, facility.name]));

  async function handleDelete(id: string) {
    const result = await deleteDocumentAction(id);
    if (!result.success) {
      toast.add({ title: 'Löschen fehlgeschlagen', description: result.error.message, type: 'error' });
      return;
    }
    toast.add({ title: 'Dokument gelöscht', type: 'success' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <UploadDocumentDialog members={members} facilities={facilities} onUploaded={() => router.refresh()} />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datei</TableHead>
            <TableHead>Größe</TableHead>
            <TableHead>Beschreibung</TableHead>
            <TableHead>Zuordnung</TableHead>
            <TableHead>Hochgeladen</TableHead>
            {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground">
                Noch kein Dokument hochgeladen.
              </TableCell>
            </TableRow>
          )}
          {initialItems.map((item) => {
            const tags = [
              item.clubMemberId ? memberById.get(item.clubMemberId) : undefined,
              item.facilityId ? facilityById.get(item.facilityId) : undefined,
            ].filter(Boolean);
            return (
              <TableRow key={item.id}>
                <TableCell>{item.fileName}</TableCell>
                <TableCell>{formatSize(item.fileSize)}</TableCell>
                <TableCell>{item.description ?? '–'}</TableCell>
                <TableCell>{tags.length ? tags.join(', ') : '–'}</TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <a href={`/api/documents/${item.id}`}>
                      <Button size="icon-sm" variant="ghost" type="button">
                        <DownloadSimpleIcon />
                        <span className="sr-only">Herunterladen</span>
                      </Button>
                    </a>
                    {canEdit && (
                      <>
                        <EditDocumentDialog item={item} members={members} facilities={facilities} onSaved={() => router.refresh()} />
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
                              <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)}>Löschen</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
