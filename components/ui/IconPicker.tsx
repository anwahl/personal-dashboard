/**
 * components/ui/IconPicker.tsx
 *
 * Trigger button + searchable modal grid for picking an icon.
 *
 * Props:
 *   icons        — all available IconRows (active)
 *   value        — currently selected icon id (null = none)
 *   onChange     — called with the new icon id (or null to clear)
 *   fallbackEmoji — shown on the trigger when value is null
 *   size         — trigger button icon size ('sm' | 'md')
 */

'use client';

import { useState, useMemo }  from 'react';
import type { IconRow }        from '@/types/schema';
import { IconDisplay }         from './IconDisplay';
import { Button }              from './Button';

interface Props {
  icons:          IconRow[];
  value:          number | null;
  onChange:       (iconId: number | null) => void;
  fallbackEmoji?: string | null;
  size?:          'sm' | 'md';
}

export function IconPicker({
  icons,
  value,
  onChange,
  fallbackEmoji,
  size = 'sm',
}: Readonly<Props>) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');

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

  const select = (iconId: number | null) => {
    onChange(iconId);
    setOpen(false);
    setSearch('');
  };

  const closeOnBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
      setSearch('');
    }
  };

  return (
    <>
      <button
        type="button"
        className="icon-picker-btn"
        onClick={() => setOpen(true)}
        title="Choose icon"
        aria-label="Choose icon"
      >
        <IconDisplay icon={currentIcon} fallbackEmoji={fallbackEmoji ?? '＋'} size={size} />
      </button>

      {open && (
        <div className="icon-picker-overlay" onClick={closeOnBackdrop}>
          <div className="icon-picker-modal" role="dialog" aria-label="Icon picker">
            <div className="icon-picker-modal__header">
              <span className="icon-picker-modal__title">Choose icon</span>
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setSearch(''); }}>✕</Button>
            </div>

            <input
              autoFocus
              type="text"
              className="input"
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
          </div>
        </div>
      )}
    </>
  );
}
