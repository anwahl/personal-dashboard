'use client';

/**
 * FormDialog — a dialog for adding or editing a record (task, appointment…).
 *
 *   <FormDialog
 *     open={open} onOpenChange={setOpen}
 *     title="Edit task"
 *     canSave={!!form.title.trim()}
 *     onSave={async () => { await updateTask(…); }}
 *     extraActions={<ConfirmButton onConfirm={remove}>Delete</ConfirmButton>}
 *   >
 *     …fields…
 *   </FormDialog>
 *
 * Phones: full screen, with Cancel · title · Save across the top and the
 * form scrolling underneath. Wider screens: a centred panel, same header.
 *
 * Save submits the form (so Enter in a text field saves too) and shows a
 * spinner while `onSave` runs. If it resolves, the dialog closes; if it
 * throws, the message is shown in the dialog and the form stays as it was.
 * Clicking outside doesn't close it; Cancel and Esc do.
 */

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export function FormDialog({
  open, onOpenChange, title, saveLabel = 'Save', canSave = true, onSave, extraActions, children,
}: Readonly<{
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  title:         ReactNode;
  saveLabel?:    string;
  /** Save stays disabled until this is true (e.g. a required field is filled). */
  canSave?:      boolean;
  onSave:        () => Promise<void> | void;
  /** Shown at the end of the form, e.g. a Delete button. */
  extraActions?: ReactNode;
  children:      ReactNode;
}>) {
  const formId = useId();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  // A fresh open starts without the last attempt's error.
  useEffect(() => { if (open) setError(''); }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSave();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={o => { if (!busy) onOpenChange(o); }}
      title={title}
      layout="form"
      size="lg"
      headerStart={
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
      }
      headerEnd={
        <Button type="submit" form={formId} variant="secondary" size="sm" busy={busy} disabled={!canSave}>
          {saveLabel}
        </Button>
      }
    >
      <form id={formId} onSubmit={submit} className="form-dialog__form">
        {error && <p className="form-dialog__error" role="alert">{error}</p>}
        {children}
        {extraActions && <div className="form-dialog__extra">{extraActions}</div>}
      </form>
    </Dialog>
  );
}
