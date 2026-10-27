'use client';

/**
 * components/media/MediaForm.tsx
 *
 * MediaDialog — add (Media list) or edit (media page) an entry.
 *
 * Also exports shared helpers (STATUS_EMOJI, capitalize, validStatusesForType)
 * used by both clients in their view/display logic.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, FormDialog, SliderField, TextField, DateField, TextAreaField, SelectField, FieldGrid } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { createMediaEntry, updateMediaEntry, addMediaStatusEntry, createMediaNote } from '@/lib/dal/media';
import { localTodayISO } from '@/lib/utils/dates';
import { useContextDate } from '@/components/sections/DayContext';
import type { MediaEntryDetail } from '@/types/dal';
import type {
  MediaTypeRow, MediaStatusRow, MediaStatusTypeLinkRow,
} from '@/types/schema';
import type { MediaSearchResult } from '@/app/api/media-search/route';
import { capitalize } from '@/lib/utils/strings';

// ── Shared helpers (exported for use in view/display code) ────────────────────

export const STATUS_EMOJI: Record<string, string> = {
  watching: '▶️', reading: '📖', playing: '🎮', finished: '✅',
  dropped: '⛔', 'want-to': '🔖', paused: '⏸️',
};

export function validStatusesForType(
  mediaTypeId: number,
  allStatuses:  MediaStatusRow[],
  links:        MediaStatusTypeLinkRow[],
): MediaStatusRow[] {
  const linked = new Map<number, Set<number>>();
  for (const l of links) {
    if (!linked.has(l.status_id)) linked.set(l.status_id, new Set());
    linked.get(l.status_id)!.add(l.media_type_id);
  }
  return allStatuses.filter(s => {
    const types = linked.get(s.id);
    return !types || types.has(mediaTypeId);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MediaFormValues {
  media_type_id: string;
  title:         string;
  status_id:     string;
  status_date:   string;
  rating:        number | null;
  platform:      string;
  creator:       string;
  notes:         string;
  review:        string;
}

export const emptyMediaFormValues: MediaFormValues = {
  media_type_id: '', title: '', status_id: '',
  status_date: localTodayISO(),
  rating: null, platform: '', creator: '', notes: '', review: '',
};

export function entryToMediaFormValues(e: MediaEntryDetail): MediaFormValues {
  return {
    media_type_id: String(e.media_type_id),
    title:         e.title,
    status_id:     e.current_status ? String(e.current_status.id) : '',
    status_date:   e.latest_status_date ?? localTodayISO(),
    rating:        e.rating,
    platform:      e.platform ?? '',
    creator:       e.creator  ?? '',
    notes:         e.notes    ?? '',
    review:        e.review   ?? '',
  };
}

// ── SearchPanel (private) ─────────────────────────────────────────────────────

function SearchPanel({ mediaTypeSlug, onSelect }: Readonly<{
  mediaTypeSlug: string;
  onSelect: (r: MediaSearchResult) => void;
}>) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/media-search?type=${mediaTypeSlug}&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally { setLoading(false); }
  }, [mediaTypeSlug]);

  const handleInput = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 400);
  };

  return (
    <div className="search-panel">
      <div className="search-panel__header">
        <TextField hideLabel label={`Search ${mediaTypeSlug}`} value={query} onChange={handleInput}
          placeholder={`Search ${capitalize(mediaTypeSlug)}…`} autoFocus />
        {loading && <span className="search-panel__loading">Searching…</span>}
      </div>
      {results.map(r => (
        <button type="button" key={r.external_id} className="search-result"
          onClick={() => onSelect(r)} onTouchEnd={() => onSelect(r)}>
          <span className="search-result__title">{r.title}</span>
          <span className="search-result__meta">
            {r.creator  && <span>{r.creator} · </span>}
            {r.year     && <span>{r.year} · </span>}
            {r.platform && <span>{r.platform}</span>}
          </span>
        </button>
      ))}
      {query.trim() && !loading && results.length === 0 && (
        <div className="search-panel__empty">No results found.</div>
      )}
    </div>
  );
}

// ── MediaDialog ───────────────────────────────────────────────────────────────

/**
 * Add or edit a media entry in a FormDialog. With `entry` it edits it (the
 * type stays as is); without, it adds one: type selector, starting on
 * `defaultTypeId`, and a search that fills in title/creator/platform.
 * A changed status is logged with its date. Saves itself and refreshes.
 */
export function MediaDialog({
  open, onOpenChange, entry, defaultTypeId, startInProgress = false, mediaTypes, mediaStatuses, statusTypeLinks,
}: Readonly<{
  open:            boolean;
  onOpenChange:    (open: boolean) => void;
  /** The entry to edit; omit to add a new one. */
  entry?:          MediaEntryDetail | null;
  /** Type a new entry starts on (e.g. the tab you're on). */
  defaultTypeId?:  string;
  /** New entries start on the type's first in-progress status (Now Playing). */
  startInProgress?: boolean;
  mediaTypes:      MediaTypeRow[];
  mediaStatuses:   MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
}>) {
  const supabase = createClient();
  const router   = useRouter();
  // New statuses are dated today, or a daily page's date when placed on one.
  const today    = useContextDate();
  const isNew    = !entry;
  const showTypeSelector = isNew;
  const enableSearch     = isNew;
  /** The status a new entry of this type starts on. */
  const startStatusFor = (typeId: string) => !startInProgress || !typeId ? ''
    : String(validStatusesForType(Number(typeId), mediaStatuses, statusTypeLinks)
        .find(st => st.status_type === 'in_progress')?.id ?? '');
  const startType = defaultTypeId ?? '';
  const initialValues = entry
    ? entryToMediaFormValues(entry)
    : { ...emptyMediaFormValues, status_date: today, media_type_id: startType, status_id: startStatusFor(startType) };

  const [form, setForm] = useState<MediaFormValues>(initialValues);
  const [showSearch, setShowSearch] = useState(false);
  // Each open starts from the entry (or blank) again.
  useEffect(() => {
    if (!open) return;
    setForm(initialValues);
    setShowSearch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (k: keyof MediaFormValues, v: string | number | null) =>
    setForm(p => ({ ...p, [k]: v }));

  const activeType    = mediaTypes.find(t => String(t.id) === form.media_type_id);
  const filteredStats = form.media_type_id
    ? validStatusesForType(Number(form.media_type_id), mediaStatuses, statusTypeLinks)
    : mediaStatuses;

  const applySearchResult = (r: MediaSearchResult) => {
    setForm(p => ({
      ...p,
      title:       r.title,
      creator:     r.creator   ?? p.creator,
      status_date: r.year ? `${r.year}-01-01` : p.status_date,
      platform:    r.platform  ?? p.platform,
    }));
    setShowSearch(false);
  };

  // A new status is dated today unless you change it (the entry's current
  // status keeps its own date).
  const pickStatus = (id: string) => setForm(p => ({
    ...p,
    status_id:   id,
    status_date: id === initialValues.status_id ? initialValues.status_date : today,
  }));

  const save = async () => {
    const fields = {
      title:    form.title.trim(),
      creator:  form.creator.trim()  || null,
      platform: form.platform.trim() || null,
      rating:   form.rating          || null,
      notes:    form.notes.trim()    || null,
      review:   form.review.trim()   || null,
    };
    let entryId: number;
    if (entry) {
      await updateMediaEntry(supabase, entry.id, fields);
      entryId = entry.id;
    } else {
      const created = await createMediaEntry(supabase, { ...fields, media_type_id: Number.parseInt(form.media_type_id) });
      entryId = created.id;
    }
    const statusChanged = String(entry?.current_status?.id ?? '') !== form.status_id;
    if (form.status_id && statusChanged) {
      await addMediaStatusEntry(supabase,
        entryId, Number.parseInt(form.status_id), form.status_date || today);
    }
    router.refresh();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? `Edit ${entry.title}` : 'Add media'}
      saveLabel={entry ? 'Save' : 'Add'}
      canSave={Boolean(form.title.trim()) && (!showTypeSelector || Boolean(form.media_type_id))}
      onSave={save}
    >
            {/* Type selector — new entries only */}
            {showTypeSelector && (
                <FieldGrid>
                <SelectField label="Type" value={form.media_type_id}
                    onChange={v => {
                        set('media_type_id', v);
                        set('status_id', startStatusFor(v));
                        setShowSearch(false);
                    }}
                    placeholder="Select type…"
                    options={mediaTypes.map(t => ({ value: t.id, label: capitalize(t.type_name) }))} />
                <SelectField label="Status" value={form.status_id} onChange={pickStatus}
                    placeholder="Select status…"
                    options={filteredStats.map(s => ({ value: s.id, label: `${STATUS_EMOJI[s.status_name] ?? ''} ${s.status_name}`.trim() }))} />
                {form.status_id && (
                    <DateField label="Status date" value={form.status_date}
                      onChange={v => set('status_date', v)} />
                )}
                </FieldGrid>
            )}

            {/* Status selector — editing (type already known) */}
            {!showTypeSelector && (
                <FieldGrid>
                <SelectField label="Status" value={form.status_id} onChange={pickStatus}
                    placeholder="No status"
                    options={filteredStats.map(s => ({ value: s.id, label: `${STATUS_EMOJI[s.status_name] ?? ''} ${s.status_name}`.trim() }))} />
                {form.status_id && (
                    <DateField label="Status date" value={form.status_date}
                      onChange={v => set('status_date', v)} />
                )}
                </FieldGrid>
            )}

            {/* Search panel — new entries only */}
            {enableSearch && activeType && !showSearch && (
                <div className="search-trigger-row">
                <Button size="sm" variant="ghost" onClick={() => setShowSearch(true)}>
                    🔍 Search and Pull from {capitalize(activeType.type_name)} database…
                </Button>
                </div>
            )}
            {enableSearch && showSearch && activeType && (
                <SearchPanel mediaTypeSlug={activeType.type_name} onSelect={applySearchResult} />
            )}

            <TextField label="Title" value={form.title} onChange={v => set('title', v)} placeholder="Title…" />
            <FieldGrid>
                <TextField label="Creator / Author / Director" value={form.creator}
                  onChange={v => set('creator', v)} />
                <TextField label="Platform" value={form.platform} onChange={v => set('platform', v)}
                  placeholder="Netflix, Kindle…" />
            </FieldGrid>
            <FieldGrid>
                <SliderField emoji="⭐" label="Rating" value={form.rating} min={0} max={10}
                onChange={v => set('rating', v)} />
            </FieldGrid>
            <TextAreaField label="Notes (while consuming)" value={form.notes} onChange={v => set('notes', v)}
              size="short" />
            <TextAreaField label="Review (after finishing)" value={form.review}
              onChange={v => set('review', v)} size="short" />
    </FormDialog>
  );
}

// ── MediaNoteDialog ───────────────────────────────────────────────────────────

/** Add a dated note to a media entry (Media list ⋯ → Add note…). */
export function MediaNoteDialog({
  open, onOpenChange, entry,
}: Readonly<{
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  entry:        MediaEntryDetail | null;
}>) {
  const supabase = createClient();
  const today    = useContextDate();
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) return;
    setDate(today);
    setNote('');
  }, [open, today]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? `Note on ${entry.title}` : 'Add note'}
      saveLabel="Add"
      canSave={Boolean(entry && note.trim())}
      onSave={async () => { if (entry) await createMediaNote(supabase, entry.id, date, note.trim()); }}
    >
      <DateField label="Date" value={date} onChange={setDate} />
      <TextAreaField label="Note" value={note} onChange={setNote} placeholder="Add a note…" autoFocus />
    </FormDialog>
  );
}
