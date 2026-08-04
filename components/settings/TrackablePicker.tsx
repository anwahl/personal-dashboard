'use client';

/**
 * components/settings/TrackablePicker.tsx
 *
 * Icon-aware custom dropdown for picking a DailyTrackableRow.
 * Replaces a plain <select> so SVG icons can appear next to each option.
 * Used in ChartSettings and LastTimeSettings.
 *
 * The dropdown uses position:fixed (not position:absolute) so it renders
 * in viewport space and is never clipped by overflow:hidden on a parent.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { IconDisplay }                               from '@/components/ui';
import type { DailyTrackableRow, IconRow }           from '@/types/schema';

interface Props {
  trackables:   DailyTrackableRow[];
  icons:        IconRow[];
  value:        string;           // trackable id as string, '' = none
  onChange:     (id: string) => void;
  placeholder?: string;
  showType?:    boolean;
}

interface DropdownPos { top: number; left: number; width: number; }

export function TrackablePicker({
  trackables, icons, value, onChange,
  placeholder = 'Select metric…',
  showType = false,
}: Readonly<Props>) {
  const [open,    setOpen]    = useState(false);
  const [pos,     setPos]     = useState<DropdownPos | null>(null);
  const triggerRef            = useRef<HTMLButtonElement>(null);

  // Calculate fixed position from the trigger's bounding rect
  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep open if clicking trigger or dropdown
      const dropdown = document.getElementById('trackable-picker-dropdown');
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (dropdown && dropdown.contains(target))
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Recalculate position on scroll/resize so dropdown follows the trigger
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const selected = value ? (trackables.find(t => String(t.id) === value) ?? null) : null;

  const select = (t: DailyTrackableRow) => {
    onChange(String(t.id));
    setOpen(false);
  };

  return (
    <div className="trackable-picker">
      <button
        ref={triggerRef}
        type="button"
        className={`trackable-picker__trigger${open ? ' trackable-picker__trigger--open' : ''}`}
        onClick={() => open ? setOpen(false) : openDropdown()}
      >
        {selected ? (
          <>
            <IconDisplay
            icon={icons.find(i => i.id === selected.icon_id) ?? null}
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

      {open && pos && (
        <div
          id="trackable-picker-dropdown"
          className="trackable-picker__dropdown"
          style={{
            position: 'fixed',
            top:      pos.top,
            left:     pos.left,
            width:    pos.width,
            zIndex:   300,
          }}
        >
          {trackables.map(t => (
            <button
              key={t.id}
              type="button"
              className={`trackable-picker__option${String(t.id) === value ? ' trackable-picker__option--selected' : ''}`}
              onClick={() => select(t)}
            >
              <IconDisplay
              icon={icons.find(i => i.id === t.icon_id) ?? null}
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
