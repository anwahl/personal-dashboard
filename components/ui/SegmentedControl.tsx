'use client';

/**
 * SegmentedControl — pick exactly one of a few options, shown as joined
 * segments (Radix ToggleGroup, single).
 *
 *   <SegmentedControl
 *     label="Sort"
 *     options={[{ value: 'order', label: 'Custom order' }, { value: 'recent', label: 'Most recent' }]}
 *     value={sortBy}
 *     onChange={setSortBy}
 *   />
 *
 * Tapping the selected segment does nothing (there's always one picked).
 * Arrow keys move between segments.
 */

import type { ReactNode } from 'react';
import { ToggleGroup } from 'radix-ui';

interface SegmentOption<T extends string> {
  value:     T;
  label:     ReactNode;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  options, value, onChange, label, size = 'default', disabled, full, className,
}: Readonly<{
  options:    SegmentOption<T>[];
  value:      T;
  onChange:   (value: T) => void;
  /** Accessible name for the group. */
  label:      string;
  size?:      'default' | 'sm';
  disabled?:  boolean;
  /** Stretch to the container's width (segments share it equally). */
  full?:      boolean;
  className?: string;
}>) {
  const cls = ['segmented', size === 'sm' && 'segmented--sm', full && 'segmented--full', className]
    .filter(Boolean).join(' ');
  return (
    <ToggleGroup.Root
      type="single"
      className={cls}
      value={value}
      onValueChange={v => { if (v) onChange(v as T); }}
      aria-label={label}
      disabled={disabled}
    >
      {options.map(o => (
        <ToggleGroup.Item key={o.value} value={o.value} disabled={o.disabled} className="segmented__item">
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
