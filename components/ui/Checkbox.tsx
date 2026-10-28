'use client';

/**
 * Checkbox — a checkbox with its label; the whole row is clickable.
 *
 *   <Checkbox checked={item.done} onCheckedChange={v => toggle(item.id, v)}>
 *     {item.item_text}
 *   </Checkbox>
 *
 * Props follow Radix Checkbox (checked / onCheckedChange).
 */

import type { ReactNode } from 'react';

export function Checkbox({
  checked, onCheckedChange, disabled, className, children,
}: Readonly<{
  checked:         boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?:       boolean;
  className?:      string;
  /** The label. */
  children:        ReactNode;
}>) {
  return (
    <label className={['checkbox', disabled && 'checkbox--disabled', className].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        className="checkbox__input"
        checked={checked}
        disabled={disabled}
        onChange={e => onCheckedChange(e.target.checked)}
      />
      <span className="checkbox__label">{children}</span>
    </label>
  );
}
