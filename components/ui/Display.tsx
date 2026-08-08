import type { ReactNode } from 'react';

// ── Save status ───────────────────────────────────────────────────────────────

export type SaveState = 'idle' | 'saving' | 'ok' | 'error';

interface SaveStatusProps {
  state:    SaveState;
  okText?:  string;
  errText?: string;
}

export function SaveStatus({
  state,
  okText  = '✓ Saved',
  errText = 'Save failed — try again',
}: Readonly<SaveStatusProps>) {
  const cls = [
    'save-status',
    state === 'ok'    && 'save-status--ok',
    state === 'error' && 'save-status--error',
  ].filter(Boolean).join(' ');

  const text =
    state === 'ok'     ? okText  :
    state === 'error'  ? errText :
    state === 'saving' ? 'Saving…' : '';

  return <p className={cls}>{text}</p>;
}

// ── Field (view-only) ─────────────────────────────────────────────────────────

interface FieldProps {
  label:      string;
  value?:     ReactNode;
  empty?:     string;
  children?:  ReactNode;
}

/** Read-only field display for View mode. */
export function Field({ label, value, empty = '—', children }: Readonly<FieldProps>) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {children ?? (
        <div className={`field__value${!value ? ' field__value--empty' : ''}`}>
          {value ?? empty}
        </div>
      )}
    </div>
  );
}

/** Input field wrapper with label — for Input mode. */
export function InputField({
  label,
  id,
  children,
}: Readonly<{
  label:    string;
  id?:      string;
  children: ReactNode;
}>) {
  return (
    <div className="field">
      {id ? (
        <label htmlFor={id} className="field__label">{label}</label>
      ) : (
        <span className="field__label">{label}</span>
      )}
      {children}
    </div>
  );
}

export function FieldGrid({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="field-grid">
      {children}
    </div>
  );
}

export function FieldActions({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="field__actions">
      {children}
    </div>
  );
}