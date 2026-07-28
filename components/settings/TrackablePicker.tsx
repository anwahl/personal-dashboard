'use client';

/**
 * components/settings/TrackablePicker.tsx
 *
 * Icon-aware custom dropdown for picking a DailyTrackableRow.
 * Replaces a plain <select> so SVG icons can appear next to each option.
 * Used in ChartSettings and LastTimeSettings.
 */

import { useState, useRef, useEffect } from 'react';
import { IconDisplay }                  from '@/components/ui/IconDisplay';
import type { DailyTrackableRow, IconRow } from '@/types/schema';

interface Props {
  trackables:   DailyTrackableRow[];
  icons:        IconRow[];
  value:        string;           // trackable id as string, '' = none
  onChange:     (id: string) => void;
  placeholder?: string;
  showType?:    boolean;          // show track_type badge in dropdown
}

export function TrackablePicker({
  trackables, icons, value, onChange,
  placeholder = 'Select metric…',
  showType = false,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = value ? (trackables.find(t => String(t.id) === value) ?? null) : null;

  const select = (t: DailyTrackableRow) => {
    onChange(String(t.id));
    setOpen(false);
  };

  return (
    <div className="trackable-picker" ref={ref}>
      <button
        type="button"
        className={`trackable-picker__trigger${open ? ' trackable-picker__trigger--open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {selected ? (
          <>
            <IconDisplay
              icon={icons.find(i => i.id === selected.icon_id) ?? null}
              fallbackEmoji={selected.emoji}
              size="sm"
            />
            <span className="trackable-picker__trigger-label">{selected.name}</span>
          </>
        ) : (
          <span className="trackable-picker__placeholder trackable-picker__trigger-label">
            {placeholder}
          </span>
        )}
        <span className="trackable-picker__caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="trackable-picker__dropdown">
          {trackables.map(t => (
            <button
              key={t.id}
              type="button"
              className={`trackable-picker__option${String(t.id) === value ? ' trackable-picker__option--selected' : ''}`}
              onClick={() => select(t)}
            >
              <IconDisplay
                icon={icons.find(i => i.id === t.icon_id) ?? null}
                fallbackEmoji={t.emoji}
                size="sm"
              />
              <span className="trackable-picker__option-name">{t.name}</span>
              {showType && (
                <span className="trackable-picker__option-type">{t.track_type}</span>
              )}
            </button>
          ))}
          {trackables.length === 0 && (
            <p style={{ padding: '8px 10px', color: 'var(--text-faint)', fontSize: '0.82rem', margin: 0 }}>
              No options available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
