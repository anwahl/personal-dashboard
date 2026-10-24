'use client';

/**
 * Fields — labelled form controls.
 *
 * Each one bundles the label, a generated id and the control, so a form
 * field is one line:
 *
 *   <DateField   label="Date" value={form.date} onChange={v => set('date', v)} />
 *   <SelectField label="For"  value={form.person} onChange={v => set('person', v)}
 *                options={people.map(p => ({ value: p.id, label: p.person_name }))}
 *                placeholder="Select person…" />
 *
 * onChange receives the new value as a string (not the event).
 *
 * In an inline row with no room for a visible label, pass `hideLabel`: the
 * control is rendered on its own and the label becomes its aria-label.
 * Any other prop (placeholder, min, max, className, disabled, autoFocus,
 * onKeyDown…) goes straight to the control.
 */

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { InputField } from './Display';

interface FieldBase {
  label:      string;
  /** Render just the control, with the label as its aria-label. */
  hideLabel?: boolean;
  value:      string | number;
  onChange:   (value: string) => void;
}

/** Wraps a control in the labelled .field container unless hideLabel is set. */
function FieldShell({
  label, hideLabel, id, children,
}: Readonly<{ label: string; hideLabel?: boolean; id: string; children: ReactNode }>) {
  if (hideLabel) return <>{children}</>;
  return <InputField label={label} id={id}>{children}</InputField>;
}

// ── Inputs ────────────────────────────────────────────────────────────────────

type InputType = 'text' | 'number' | 'date' | 'time' | 'datetime-local' | 'color' | 'email' | 'url' | 'search';

type InputProps = FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'id'>;

/**
 * A labelled text input. `type` switches it to another kind of input, for
 * config-driven forms; otherwise use the presets below.
 */
export function TextField({
  label, hideLabel, value, onChange, type = 'text', ...rest
}: Readonly<InputProps & { type?: InputType }>) {
  const id = useId();
  return (
    <FieldShell label={label} hideLabel={hideLabel} id={id}>
      <input
        {...rest}
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={hideLabel ? label : undefined}
      />
    </FieldShell>
  );
}

/** A labelled number input (value comes back as a string; parse it yourself). */
export function NumberField(props: Readonly<InputProps>)   { return <TextField {...props} type="number" />; }
/** A labelled date input (YYYY-MM-DD). */
export function DateField(props: Readonly<InputProps>)     { return <TextField {...props} type="date" />; }
/** A labelled time input (HH:MM). */
export function TimeField(props: Readonly<InputProps>)     { return <TextField {...props} type="time" />; }
/** A labelled date-and-time input. */
export function DateTimeField(props: Readonly<InputProps>) { return <TextField {...props} type="datetime-local" />; }

// ── Textarea ──────────────────────────────────────────────────────────────────

type TextAreaProps = FieldBase & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'id'> & {
  /** short = 60px, tall = 120px; default is the global 80px. */
  size?: 'short' | 'tall';
};

/** A labelled textarea. */
export function TextAreaField({
  label, hideLabel, value, onChange, size, className, ...rest
}: Readonly<TextAreaProps>) {
  const id  = useId();
  const cls = [size && `textarea--${size}`, className].filter(Boolean).join(' ') || undefined;
  return (
    <FieldShell label={label} hideLabel={hideLabel} id={id}>
      <textarea
        {...rest}
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cls}
        aria-label={hideLabel ? label : undefined}
      />
    </FieldShell>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value:     string | number;
  label:     string;
  disabled?: boolean;
}

type SelectProps = FieldBase & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'id' | 'children'> & {
  options:      SelectOption[];
  /** Adds a first option with value "" and this text (e.g. "No type"). */
  placeholder?: string;
};

/** A labelled native select. */
export function SelectField({
  label, hideLabel, value, onChange, options, placeholder, ...rest
}: Readonly<SelectProps>) {
  const id = useId();
  return (
    <FieldShell label={label} hideLabel={hideLabel} id={id}>
      <select
        {...rest}
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={hideLabel ? label : undefined}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}
