'use client';

/**
 * FieldInputs — renders a config-driven set of fields (AddField[]) for an
 * add row or an edit form. Shared by ManageableList and HierarchicalList so
 * both lists support the same field types.
 *
 * Values are strings (as typed); icon fields hold a number | null. The caller
 * owns the state and converts values when saving (see buildPayload).
 */

import type { KeyboardEvent } from 'react';
import { IconPicker, TextField, TextAreaField, SelectField } from '@/components/ui';
import type { IconRow } from '@/types/schema';

export interface AddField {
  key:          string;
  label:        string;
  type:         'text' | 'textarea' | 'number' | 'color' | 'icon' | 'select';
  placeholder?: string;
  required?:    boolean;
  width?:       number;     // px, for short fields like color pickers
  options?:     { value: string; label: string }[];  // for type: 'select'
  parseAs?:     'string' | 'int' | 'float';  // how to cast select value in payload
  /** If false, this field is omitted from the edit form (but still appears in the add row). */
  showInEdit?:  boolean;
  /** Show the field only when this returns true for the current values
   *  (e.g. a colour that only applies to one type). */
  showWhen?:    (values: Record<string, string>) => boolean;
  /** Initial value in the add row. A select with a default has no blank option. */
  defaultValue?: string;
}

export type FieldValues = Record<string, string>;
export type IconValues  = Record<string, number | null>;

/** Fields visible for the given mode and current values. */
export function visibleFields(fields: AddField[], mode: 'add' | 'edit', values: FieldValues): AddField[] {
  return fields.filter(f =>
    (mode === 'add' || f.showInEdit !== false) &&
    (!f.showWhen || f.showWhen(values)));
}

/** Converts field values to a DB payload (numbers parsed, blanks → null). */
export function buildPayload(
  fields: AddField[],
  values: FieldValues,
  iconValues: IconValues,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === 'icon') {
      payload[f.key] = iconValues[f.key] ?? null;
    } else if (f.type === 'number') {
      payload[f.key] = values[f.key] ? Number.parseFloat(values[f.key]) : null;
    } else if (f.type === 'select') {
      const raw = values[f.key];
      payload[f.key] = raw
        ? (f.parseAs === 'int' ? Number.parseInt(raw) : f.parseAs === 'float' ? Number.parseFloat(raw) : raw)
        : null;
    } else {
      payload[f.key] = values[f.key]?.trim() || null;
    }
  }
  return payload;
}

/** Blank values for a set of fields. */
export function emptyValues(fields: AddField[]): { values: FieldValues; iconValues: IconValues } {
  return {
    values:     Object.fromEntries(fields.filter(f => f.type !== 'icon').map(f => [f.key, f.defaultValue ?? ''])),
    iconValues: Object.fromEntries(fields.filter(f => f.type === 'icon').map(f => [f.key, null])),
  };
}

/** Current values of an item, for starting an edit. */
export function valuesFrom(fields: AddField[], item: Record<string, unknown>): { values: FieldValues; iconValues: IconValues } {
  const values: FieldValues = {};
  const iconValues: IconValues = {};
  for (const f of fields) {
    if (f.type === 'icon') iconValues[f.key] = (item[f.key] as number | null) ?? null;
    else values[f.key] = item[f.key] != null ? String(item[f.key]) : '';
  }
  return { values, iconValues };
}

interface FieldInputsProps {
  fields:        AddField[];
  mode:          'add' | 'edit';
  values:        FieldValues;
  iconValues:    IconValues;
  onChange:      (key: string, value: string) => void;
  onIconChange:  (key: string, id: number | null) => void;
  /** Enter in a single-line field (save / add). */
  onEnter?:      () => void;
  /** Escape in a field (cancel an edit). */
  onEscape?:     () => void;
  icons?:        IconRow[];
  autoFocusKey?: string;
}

export function FieldInputs({
  fields, mode, values, iconValues, onChange, onIconChange,
  onEnter, onEscape, icons = [], autoFocusKey,
}: Readonly<FieldInputsProps>) {
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  onEnter?.();
    if (e.key === 'Escape') onEscape?.();
  };

  return (
    <>
      {visibleFields(fields, mode, values).map(f => {
        // Dynamic px width from caller config — legitimate inline style exception
        const sizing = { flex: f.width ? 'none' : 1, width: f.width ?? undefined, minWidth: mode === 'add' ? 80 : undefined };

        switch (f.type) {
          case 'icon':
            return (
              <IconPicker
                key={f.key}
                icons={icons}
                value={iconValues[f.key] ?? null}
                onChange={id => onIconChange(f.key, id)}
                size="sm"
              />
            );
          case 'select':
            return (
              <SelectField
                key={f.key}
                hideLabel
                label={f.label}
                value={values[f.key] ?? ''}
                onChange={v => onChange(f.key, v)}
                style={sizing}
                placeholder={f.defaultValue == null ? (f.placeholder ?? `No ${f.label.toLowerCase()}`) : undefined}
                options={f.options ?? []}
              />
            );
          case 'textarea':
            return (
              <TextAreaField
                key={f.key}
                hideLabel
                label={f.label}
                size="short"
                className="input--flex"
                value={values[f.key] ?? ''}
                placeholder={f.placeholder ?? f.label}
                onChange={v => onChange(f.key, v)}
                onKeyDown={e => { if (e.key === 'Escape') onEscape?.(); }}
                autoFocus={f.key === autoFocusKey}
              />
            );
          default:
            return (
              <TextField
                key={f.key}
                hideLabel
                label={f.label}
                type={f.type}
                value={values[f.key] ?? ''}
                onChange={v => onChange(f.key, v)}
                onKeyDown={onKeyDown}
                placeholder={f.placeholder ?? (mode === 'add' ? f.label : undefined)}
                style={sizing}
                autoFocus={f.key === autoFocusKey}
              />
            );
        }
      })}
    </>
  );
}
