'use client';

/**
 * ChipSelect — a row of toggle chips for picking several options
 * (or one, with `single`).
 *
 *   <ChipSelect
 *     label="Info groups"
 *     options={groups.map(g => ({ value: g.id, label: g.group_title }))}
 *     selected={linkedIds}
 *     onToggle={(id, on) => link(id, on)}
 *   />
 *
 * Each chip is a toggle button (aria-pressed). onToggle reports the option
 * and whether it is now selected; the caller saves and updates `selected`.
 * With `onClear`, a "✕ clear" chip appears while anything is selected.
 */

import type { ReactNode } from 'react';
import { Chip, ChipGroup } from './Chip';

export interface ChipOption<T extends string | number> {
  value:     T;
  label:     ReactNode;
  disabled?: boolean;
}

export function ChipSelect<T extends string | number>({
  options,
  selected,
  onToggle,
  onClear,
  small = true,
  label,
  className,
}: Readonly<{
  options:    ChipOption<T>[];
  selected:   readonly T[];
  /** For a pick-one list, replace the selection with `value` when `on` is
   *  true and clear it when false (tapping the picked chip unpicks it). */
  onToggle:   (value: T, on: boolean) => void;
  onClear?:   () => void;
  small?:     boolean;
  /** Accessible name for the group. */
  label?:     string;
  className?: string;
}>) {
  return (
    <div role="group" aria-label={label} className={className}>
      <ChipGroup>
        {options.map(opt => {
          const on = selected.includes(opt.value);
          return (
            <Chip
              key={String(opt.value)}
              active={on}
              small={small}
              fixed={false}
              aria-pressed={on}
              disabled={opt.disabled}
              onClick={() => onToggle(opt.value, !on)}
            >
              {opt.label}
            </Chip>
          );
        })}
        {onClear && selected.length > 0 && (
          <Chip small={small} fixed={false} onClick={onClear}>✕ clear</Chip>
        )}
      </ChipGroup>
    </div>
  );
}
