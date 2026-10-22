'use client';

/**
 * components/settings/TrackablePicker.tsx
 *
 * Icon-aware dropdown for picking a DailyTrackableRow (Radix Select).
 * Used in ChartSettings and LastTimeSettings.
 *
 * The list renders in a portal, opens above the button when there isn't
 * room below (keeping clear of the phone tab bar), can be wider than the
 * button so names aren't cut off, and supports keyboard and type-to-find.
 */

import { useState } from 'react';
import { Select } from 'radix-ui';
import { ChevronDown } from 'lucide-react';
import { IconDisplay } from '@/components/ui';
import type { DailyTrackableRow, IconRow } from '@/types/schema';

interface Props {
  trackables:   DailyTrackableRow[];
  icons:        IconRow[];
  value:        string;           // trackable id as string, '' = none
  onChange:     (id: string) => void;
  placeholder?: string;
  showType?:    boolean;
}

const EDGE = 8;

/** Space to keep clear at the bottom: the phone tab bar, when it's showing. */
function bottomPadding(): number {
  const bar = document.querySelector('.mobile-tabbar');
  const h = bar ? bar.getBoundingClientRect().height : 0;
  return EDGE + h;
}

export function TrackablePicker({
  trackables, icons, value, onChange,
  placeholder = 'Select metric…',
  showType = false,
}: Readonly<Props>) {
  const [bottom, setBottom] = useState(EDGE);
  const iconOf = (t: DailyTrackableRow) => icons.find(i => i.id === t.icon_id) ?? null;

  return (
    <Select.Root
      value={value}
      onValueChange={onChange}
      onOpenChange={open => { if (open) setBottom(bottomPadding()); }}
    >
      <Select.Trigger className="trackable-picker__trigger" aria-label={placeholder}>
        <span className="trackable-picker__trigger-label">
          <Select.Value placeholder={<span className="trackable-picker__placeholder">{placeholder}</span>} />
        </span>
        <Select.Icon className="trackable-picker__caret">
          <ChevronDown size={16} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="trackable-picker__dropdown"
          position="popper"
          sideOffset={4}
          collisionPadding={{ top: EDGE, left: EDGE, right: EDGE, bottom }}
        >
          <Select.Viewport className="trackable-picker__viewport">
            {trackables.map(t => (
              <Select.Item key={t.id} value={String(t.id)} className="trackable-picker__option">
                <Select.ItemText>
                  <span className="trackable-picker__option-label">
                    <IconDisplay icon={iconOf(t)} size="sm" />
                    {t.name}
                  </span>
                </Select.ItemText>
                {showType && <span className="trackable-picker__option-type">{t.track_type}</span>}
              </Select.Item>
            ))}
            {trackables.length === 0 && (
              <p className="trackable-picker__empty">No options available.</p>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
