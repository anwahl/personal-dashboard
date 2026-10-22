'use client';

/**
 * components/media/MediaForm.tsx
 *
 * Shared form used by MediaClient (add/edit from the list page) and
 * MediaDetailClient (edit mode on the detail page).
 *
 * Also exports shared helpers (STATUS_EMOJI, capitalize, validStatusesForType)
 * used by both clients in their view/display logic.
 */

import { useState, useCallback, useRef } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, FieldActions, SliderField, TextField, DateField, TextAreaField, SelectField } from '@/components/ui';
import { localTodayISO } from '@/lib/utils/dates';
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

// ── MediaForm ─────────────────────────────────────────────────────────────────

interface Props {
  initialValues:    MediaFormValues;
  mediaTypes:       MediaTypeRow[];
  mediaStatuses:    MediaStatusRow[];
  statusTypeLinks:  MediaStatusTypeLinkRow[];
  /** Show the media type selector (list page add/edit). Default: false. */
  showTypeSelector?: boolean;
  /** Enable the "Search database" panel (list page only). Default: false. */
  enableSearch?:    boolean;
  saving:           boolean;
  /** Display a save error message (detail page). */
  saveError?:       string;
  saveLabel?:       string;
  onSave:           (values: MediaFormValues) => void;
  onCancel:         () => void;
  onDelete?:        () => void;
}

export function MediaForm({
  initialValues, mediaTypes, mediaStatuses, statusTypeLinks,
  showTypeSelector = false,
  enableSearch     = false,
  saving, saveError, saveLabel = 'Save',
  onSave, onCancel, onDelete,
}: Readonly<Props>) {
  const [form, setForm] = useState<MediaFormValues>(initialValues);
  const [showSearch, setShowSearch] = useState(false);
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

  return (
    <Card>
        <CardHeader>
            <CardTitle>{form.title ? 'Edit ' + form.title : 'Add New Media'}</CardTitle>
        </CardHeader>
        <CardBody>
            {/* Type selector — list page only */}
            {showTypeSelector && (
                <div className="field-grid">
                <SelectField label="Type" value={form.media_type_id}
                    onChange={v => {
                        set('media_type_id', v);
                        set('status_id', '');
                        setShowSearch(false);
                    }}
                    placeholder="Select type…"
                    options={mediaTypes.map(t => ({ value: t.id, label: capitalize(t.type_name) }))} />
                <SelectField label="Status" value={form.status_id} onChange={v => set('status_id', v)}
                    placeholder="Select status…"
                    options={filteredStats.map(s => ({ value: s.id, label: `${STATUS_EMOJI[s.status_name] ?? ''} ${s.status_name}`.trim() }))} />
                {form.status_id && (
                    <DateField label="Status date" value={form.status_date}
                      onChange={v => set('status_date', v)} />
                )}
                </div>
            )}

            {/* Status selector — detail page (type already known, shown in a simpler grid) */}
            {!showTypeSelector && (
                <div className="field-grid">
                <SelectField label="Status" value={form.status_id} onChange={v => set('status_id', v)}
                    placeholder="No status"
                    options={filteredStats.map(s => ({ value: s.id, label: `${STATUS_EMOJI[s.status_name] ?? ''} ${s.status_name}`.trim() }))} />
                {form.status_id && (
                    <DateField label="Status date" value={form.status_date}
                      onChange={v => set('status_date', v)} />
                )}
                </div>
            )}

            {/* Search panel — list page only */}
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
            <div className="field-grid">
                <TextField label="Creator / Author / Director" value={form.creator}
                  onChange={v => set('creator', v)} />
                <TextField label="Platform" value={form.platform} onChange={v => set('platform', v)}
                  placeholder="Netflix, Kindle…" />
            </div>
            <div className="field-grid">
                <SliderField emoji="⭐" label="Rating" value={form.rating} min={0} max={10}
                onChange={v => set('rating', v)} />
            </div>
            <TextAreaField label="Notes (while consuming)" value={form.notes} onChange={v => set('notes', v)}
              size="short" />
            <TextAreaField label="Review (after finishing)" value={form.review}
              onChange={v => set('review', v)} size="short" />

            {saveError && <p className="save-status save-status--error">{saveError}</p>}

            <FieldActions docked alignment="right">
                <Button
                variant="accent"
                onClick={() => onSave(form)}
                busy={saving} disabled={!form.title.trim() || (showTypeSelector && !form.media_type_id)}
                >
                {saveLabel}
                </Button>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                {onDelete && (
                <Button variant="danger" onClick={onDelete} disabled={saving}>Delete</Button>
                )}
            </FieldActions>
        </CardBody>
    </Card>
  );
}