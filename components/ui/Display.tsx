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

export function Info({ value, empty = '—', className, children }:
  Readonly<{
    value?:     ReactNode;
    empty?:     string;
    className?: string;
    children?:  ReactNode;
  }>) {
  const classes = [`field__info${!value 
    ? ' field__value--empty' : ''}`,
    className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {value ?? children ?? empty}
    </div>
  );
}

export function Meta({ value, empty = '—', className, children }:
  Readonly<{
    value?:     ReactNode;
    empty?:     string;
    className?: string;
    children?:  ReactNode;
  }>) {
  const classes = ['item__meta--wrapper', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {value ?? children ?? empty}
    </div>
  );
}

export const ITEM_TYPES = {
  TITLE: 'title',
  DANGER: 'danger',
  ALERT: 'alert',
  SUCCESS: 'success',
  INFO: 'info',
  META: 'meta',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DEFAULT: 'default',
  BOLD: 'bold',
  ITALIC: 'italic'
} as const;

export type ItemType = typeof ITEM_TYPES[keyof typeof ITEM_TYPES];


export function Item({ itemType = ITEM_TYPES.DEFAULT, itemModifier, value, className }:
  Readonly<{
    itemType?:       ItemType;
    itemModifier?:  ItemType | ItemType[];
    value:          ReactNode;
    className?:     string;
  }>) {
  const modifiers = itemModifier ? [itemModifier].flat() : [itemType];
  const modifierClasses = modifiers.map(m => `item__modifier--${m}`).join(' ');
  const classes = [`item__${itemType}`, modifierClasses, className].filter(Boolean).join(' ');
 
  return (
    <div className={classes}>
      {value}
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

type AlignmentType = 'top' | 'bottom' | 'middle' | 'left' | 'right';

/**
 * FieldActions — a row of action buttons.
 *
 * alignment="right" lays children out right-to-left (row-reverse), so list
 * the primary action FIRST and it lands at the right edge.
 *
 * docked: a page-level save bar. On phones it docks full-width directly above
 * the mobile tab bar (and hides while a field has focus, so it doesn't float
 * over the iOS keyboard); on desktop it stays inline where it's placed.
 */
export function FieldActions({
  children,
  alignment = 'top',
  boxed = false,
  docked = false,
  className
}: Readonly<{
  children:       ReactNode;
  alignment?:     AlignmentType;
  boxed?:         boolean;
  docked?:        boolean;
  className?:     string;
}>) {
  const classes = [
    'field__actions',
    `field__actions--${alignment}`,
    docked && 'field__actions--docked',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {boxed && (<hr className='hr-md' />)}
      <div className='field__actions--body'>
        {children}
      </div>
      {boxed && (<hr className='hr-md' />)}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

/** The "nothing here" line for an empty list or section. */
export function EmptyState({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <p className={['empty-state', className].filter(Boolean).join(' ')}>{children}</p>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warn' | 'danger' | 'muted';

/** Small inline label pill (a type, status, or count). */
export function Badge({
  variant = 'default',
  className,
  children,
}: Readonly<{
  variant?:   BadgeVariant;
  className?: string;
  children:   ReactNode;
}>) {
  const classes = ['badge', variant !== 'default' && `badge--${variant}`, className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}

