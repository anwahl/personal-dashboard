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
import { Button, Card, CardBody, CardHeader, CardTitle, InputField, SliderField } from '@/components/ui';
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
        <input type="text" value={query} onChange={e => handleInput(e.target.value)}
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
                <InputField label="Type" id="mf-type">
                    <select id="mf-type" value={form.media_type_id}
                    onChange={e => {
                        set('media_type_id', e.target.value);
                        set('status_id', '');
                        setShowSearch(false);
                    }}>
                    <option value="">Select type…</option>
                    {mediaTypes.map(t => (
                        <option key={t.id} value={t.id}>{capitalize(t.type_name)}</option>
                    ))}
                    </select>
                </InputField>
                <InputField label="Status" id="mf-status">
                    <select id="mf-status" value={form.status_id}
                    onChange={e => set('status_id', e.target.value)}>
                    <option value="">Select status…</option>
                    {filteredStats.map(s => (
                        <option key={s.id} value={s.id}>
                        {STATUS_EMOJI[s.status_name] ?? ''} {s.status_name}
                        </option>
                    ))}
                    </select>
                </InputField>
                {form.status_id && (
                    <InputField label="Status date" id="mf-status-date">
                    <input id="mf-status-date" type="date" value={form.status_date}
                        onChange={e => set('status_date', e.target.value)} />
                    </InputField>
                )}
                </div>
            )}

            {/* Status selector — detail page (type already known, shown in a simpler grid) */}
            {!showTypeSelector && (
                <div className="field-grid">
                <InputField label="Status" id="mf-status">
                    <select id="mf-status" value={form.status_id}
                    onChange={e => set('status_id', e.target.value)}>
                    <option value="">No status</option>
                    {filteredStats.map(s => (
                        <option key={s.id} value={s.id}>
                        {STATUS_EMOJI[s.status_name] ?? ''} {s.status_name}
                        </option>
                    ))}
                    </select>
                </InputField>
                {form.status_id && (
                    <InputField label="Status date" id="mf-status-date">
                    <input id="mf-status-date" type="date" value={form.status_date}
                        onChange={e => set('status_date', e.target.value)} />
                    </InputField>
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

            <InputField label="Title" id="mf-title">
                <input id="mf-title" type="text" value={form.title}
                onChange={e => set('title', e.target.value)} placeholder="Title…" />
            </InputField>
            <div className="field-grid">
                <InputField label="Creator / Author / Director" id="mf-creator">
                <input id="mf-creator" type="text" value={form.creator}
                    onChange={e => set('creator', e.target.value)} />
                </InputField>
                <InputField label="Platform" id="mf-platform">
                <input id="mf-platform" type="text" value={form.platform}
                    onChange={e => set('platform', e.target.value)} placeholder="Netflix, Kindle…" />
                </InputField>
            </div>
            <div className="field-grid">
                <SliderField emoji="⭐" label="Rating" value={form.rating} min={0} max={10}
                onChange={v => set('rating', v)} />
            </div>
            <InputField label="Notes (while consuming)" id="mf-notes">
                <textarea id="mf-notes" value={form.notes}
                onChange={e => set('notes', e.target.value)} className="textarea--short" />
            </InputField>
            <InputField label="Review (after finishing)" id="mf-review">
                <textarea id="mf-review" value={form.review}
                onChange={e => set('review', e.target.value)} className="textarea--short" />
            </InputField>

            {saveError && <p className="save-status save-status--error">{saveError}</p>}

            <div className="page-actions">
                <Button
                variant="accent"
                onClick={() => onSave(form)}
                disabled={saving || !form.title.trim() || (showTypeSelector && !form.media_type_id)}
                >
                {saving ? 'Saving…' : saveLabel}
                </Button>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                {onDelete && (
                <Button variant="danger" onClick={onDelete} disabled={saving}>Delete</Button>
                )}
            </div>
        </CardBody>
    </Card>
  );
}