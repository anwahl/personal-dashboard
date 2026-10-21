/**
 * Trigger button + searchable modal grid for picking an icon.
 *
 * Props:
 *   icons        — all available IconRows (active)
 *   value        — currently selected icon id (null = none)
 *   onChange     — called with the new icon id (or null to clear)
 *   size         — trigger button icon size ('sm' | 'md')
 */

'use client';

import { useState, useMemo, useRef } from 'react';
import type { IconRow }               from '@/types/schema';
import { IconDisplay }                from './IconDisplay';
import { Dialog }                     from './Dialog';

interface Props {
  icons:          IconRow[];
  value:          number | null;
  onChange:       (iconId: number | null) => void;
  size?:          'sm' | 'md';
}

export function IconPicker({
  icons,
  value,
  onChange,
  size = 'sm',
}: Readonly<Props>) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const searchRef           = useRef<HTMLInputElement>(null);

  const currentIcon = useMemo(
    () => icons.find(i => i.id === value) ?? null,
    [icons, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.tags ?? '').toLowerCase().includes(q),
    );
  }, [icons, search]);

  // Reset the search when opening (not closing), so the grid doesn't
  // visibly re-fill while the exit animation plays.
  const openPicker = () => {
    setSearch('');
    setOpen(true);
  };

  const select = (iconId: number | null) => {
    onChange(iconId);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="icon-picker-btn"
        onClick={openPicker}
        title="Choose icon"
        aria-label="Choose icon"
      >
        <IconDisplay icon={currentIcon} size={size} />
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Choose icon"
        desktopFocusRef={searchRef}
      >
        <input
          ref={searchRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Search by name or tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="icon-picker-grid">
          {/* None / clear option */}
          <button
            type="button"
            className={`icon-picker-cell icon-picker-cell--none${value === null ? ' icon-picker-cell--active' : ''}`}
            onClick={() => select(null)}
          >
            <span className="icon-picker-cell__icon">—</span>
            <span className="icon-picker-cell__name">None</span>
          </button>

          {filtered.map(icon => (
            <button
              key={icon.id}
              type="button"
              className={`icon-picker-cell${value === icon.id ? ' icon-picker-cell--active' : ''}`}
              onClick={() => select(icon.id)}
              title={icon.name}
            >
              <span className="icon-picker-cell__icon">
                <IconDisplay icon={icon} size="md" />
              </span>
              <span className="icon-picker-cell__name">{icon.name}</span>
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="icon-picker-empty">No icons match &ldquo;{search}&rdquo;.</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
