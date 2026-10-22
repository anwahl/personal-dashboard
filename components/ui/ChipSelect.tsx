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
 */

import type { ReactNode } from 'react';
import { Chip, ChipGroup } from './Chip';

export interface ChipOption<T extends string | number> {
  value: T;
  label: ReactNode;
}

export function ChipSelect<T extends string | number>({
  options,
  selected,
  onToggle,
  single = false,
  small = true,
  label,
  className,
}: Readonly<{
  options:    ChipOption<T>[];
  selected:   readonly T[];
  onToggle:   (value: T, selected: boolean) => void;
  /** Only one at a time: picking a chip reports it selected; the caller
   *  replaces the selection. Tapping the selected chip deselects it. */
  single?:    boolean;
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
              onClick={() => onToggle(opt.value, !on)}
            >
              {opt.label}
            </Chip>
          );
        })}
      </ChipGroup>
    </div>
  );
}
