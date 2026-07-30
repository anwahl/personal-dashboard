'use client';

/**
 * TagSelector
 *
 * Searchable tag combobox with inline "Add" for new tags.
 * - Type to filter existing tags
 * - Click to select / deselect
 * - If typed value matches nothing: shows "+ Add 'x'" option
 * - Selected tags appear as removable chips above the input
 */

import { useState, useRef, useEffect } from 'react';
import { Chip, ChipGroup } from '@/components/ui';
import type { TagRow } from '@/types/schema';

interface Props {
  allTags:    TagRow[];
  selectedIds: number[];
  onToggle:   (tagId: number) => void;
  onAdd:      (value: string) => Promise<void>;
  placeholder?: string;
}

export function TagSelector({ allTags, selectedIds, onToggle, onAdd, placeholder = 'Search or add tag…' }: Readonly<Props>) {
  const [query,     setQuery]     = useState('');
  const [open,      setOpen]      = useState(false);
  const [adding,    setAdding]    = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected   = allTags.filter(t => selectedIds.includes(t.id));
  const unselected = allTags.filter(t => !selectedIds.includes(t.id));
  const q          = query.trim().toLowerCase();

  const filtered = q
    ? unselected.filter(t => t.tag_value.includes(q))
    : unselected;

  const exactMatch = allTags.some(t => t.tag_value === q);
  const showAdd    = q.length > 0 && !exactMatch;
  const showList   = open && (filtered.length > 0 || showAdd);

  const select = (id: number) => {
    onToggle(id);
    setQuery('');
    setOpen(false);
  };

  const addNew = async () => {
    if (!q || adding) return;
    setAdding(true);
    try {
      await onAdd(q);
      setQuery('');
      setOpen(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="tag-selector" ref={containerRef}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <ChipGroup>
          {selected.map(t => (
            <Chip
              key={t.id}
              active
              small
              onClick={() => onToggle(t.id)}
            >
              {t.tag_value} <span className="tag-selector__remove" aria-label="Remove">×</span>
            </Chip>
          ))}
        </ChipGroup>
      )}

      {/* Search input */}
      <div className="tag-selector__input-wrap">
        <input
          className="tag-selector__input"
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (filtered.length === 1) select(filtered[0].id);
              else if (showAdd) addNew();
            }
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
          }}
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {showList && (
        <div className="tag-selector__dropdown">
          {filtered.map(t => (
            <button
              key={t.id}
              type="button"
              className="tag-selector__option"
              onMouseDown={e => { e.preventDefault(); select(t.id); }}
            >
              {t.tag_value}
            </button>
          ))}
          {showAdd && (
            <button
              type="button"
              className="tag-selector__option tag-selector__option--add"
              onMouseDown={e => { e.preventDefault(); addNew(); }}
              disabled={adding}
            >
              + Add "{q}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
