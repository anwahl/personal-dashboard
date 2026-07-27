'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';
import { Button }                   from '@/components/ui/Button';
import {
  getMediaNotes, createMediaNote, deleteMediaNote,
  updateMediaEntry, createMediaEntry, addMediaStatusEntry, deleteMediaEntry,
} from '@/lib/dal/media';
import { TabBar }                 from '@/components/ui/Controls';
import { InputField }             from '@/components/ui/Display';
import { Markdown }               from '@/components/ui/Markdown';
import type { MediaEntryDetail }  from '@/types/dal';
import { formatMediumDate, localTodayISO } from '@/lib/utils/dates';
import type {
  MediaTypeRow, MediaStatusRow,
  MediaNoteRow, MediaStatusTypeLinkRow,
} from '@/types/schema';
import type { MediaSearchResult } from '@/app/api/media-search/route';

interface Props {
  entries:         MediaEntryDetail[];
  mediaTypes:      MediaTypeRow[];
  mediaStatuses:   MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_EMOJI: Record<string, string> = {
  watching: '▶️', reading: '📖', playing: '🎮', finished: '✅',
  dropped: '⛔', 'want-to': '🔖', paused: '⏸️',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function validStatusesForType(
  mediaTypeId: number,
  allStatuses: MediaStatusRow[],
  links: MediaStatusTypeLinkRow[],
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

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  media_type_id: string;
  title:         string;
  status_id:     string;
  status_date:   string;
  rating:        string;
  platform:      string;
  creator:       string;
  notes:         string;
  review:        string;
}

const EMPTY_FORM: FormState = {
  media_type_id: '', title: '', status_id: '',
  status_date: localTodayISO(),
  rating: '', platform: '', creator: '', notes: '', review: '',
};

function entryToForm(e: MediaEntryDetail): FormState {
  return {
    media_type_id: String(e.media_type_id),
    title:         e.title,
    status_id:     e.current_status ? String(e.current_status.id) : '',
    status_date:   e.latest_status_date ?? localTodayISO(),
    rating:        e.rating ? String(e.rating) : '',
    platform:      e.platform ?? '',
    creator:       e.creator  ?? '',
    notes:         e.notes    ?? '',
    review:        e.review   ?? '',
  };
}

// ── Search panel ──────────────────────────────────────────────────────────────

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
        <button
          type="button"
          key={r.external_id}
          className="search-result"
          onClick={() => onSelect(r)}
          onTouchEnd={() => onSelect(r)}
        >
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

// ── Media form ────────────────────────────────────────────────────────────────

function MediaForm({ form, setForm, mediaTypes, mediaStatuses, statusTypeLinks, onSave, onCancel, onDelete, editId, saving }: Readonly<{
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  mediaTypes:      MediaTypeRow[];
  mediaStatuses:   MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  editId?: number;
  saving: boolean;
}>) {
  const [showSearch, setShowSearch] = useState(false);
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

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
    <div className="form-panel--card">
      <p className="form-panel__title">{editId ? 'Edit entry' : 'Add entry'}</p>

      <div className="field-grid">
        <InputField label="Type" id="mf-type">
          <select id="mf-type" value={form.media_type_id}
            onChange={e => { set('media_type_id', e.target.value); set('status_id', ''); setShowSearch(false); }}>
            <option value="">Select type…</option>
            {mediaTypes.map(t => <option key={t.id} value={t.id}>{capitalize(t.type_name)}</option>)}
          </select>
        </InputField>
        <InputField label="Status" id="mf-status">
          <select id="mf-status" value={form.status_id} onChange={e => set('status_id', e.target.value)}>
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

      {activeType && !showSearch && (
        <div className="search-trigger-row">
          <Button size="sm" variant="ghost" onClick={() => setShowSearch(true)}>
            🔍 Search and Pull from {capitalize(activeType.type_name)} database…
          </Button>
        </div>
      )}
      {showSearch && activeType && (
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
        <InputField label="Rating (1-10)" id="mf-rating">
          <input id="mf-rating" type="number" min={1} max={10} value={form.rating}
            onChange={e => set('rating', e.target.value)} />
        </InputField>
      </div>
      <InputField label="Notes (while consuming)" id="mf-notes">
        <textarea id="mf-notes" value={form.notes} onChange={e => set('notes', e.target.value)} className="textarea--short" />
      </InputField>
      <InputField label="Review (after finishing)" id="mf-review">
        <textarea id="mf-review" value={form.review} onChange={e => set('review', e.target.value)} className="textarea--short" />
      </InputField>

      <div className="form-panel__actions">
        <Button variant="accent" onClick={onSave} disabled={saving || !form.title.trim() || !form.media_type_id}>
          {saving ? 'Saving…' : editId ? 'Update' : 'Add'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        {onDelete && <Button variant="danger" onClick={onDelete} disabled={saving}>Delete</Button>}
      </div>
    </div>
  );
}

// ── Media item view (expanded) ────────────────────────────────────────────────

function MediaItemView({ entry, onEdit, onClose }: Readonly<{
  entry: MediaEntryDetail;
  onEdit: () => void;
  onClose: () => void;
}>) {
  const supabase = createClient();
  const [notes,      setNotes]      = useState<MediaNoteRow[]>([]);
  const [newNote,    setNewNote]    = useState('');
  const [noteDate,   setNoteDate]   = useState(localTodayISO());
  const [addingNote, setAddingNote] = useState(false);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    getMediaNotes(supabase, entry.id).then(notes => { setNotes(notes); setLoading(false); });
  }, [entry.id]);

  const addNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const note = await createMediaNote(supabase, entry.id, noteDate, newNote.trim());
      setNotes(prev => [note, ...prev]);
      setNewNote('');
    } finally { setAddingNote(false); }
  }, [supabase, entry.id, noteDate, newNote]);

  const deleteNote = useCallback(async (id: number) => {
    await deleteMediaNote(supabase, id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, [supabase]);

  return (
    <div className="expand-panel">
      {entry.creator && (
        <p className="media-entry__creator">by {entry.creator}</p>
      )}
      <div className="media-entry__badges">
        {entry.current_status && (
          <span className="badge">
            {STATUS_EMOJI[entry.current_status.status_name] ?? ''} {entry.current_status.status_name}
          </span>
        )}
        {entry.rating  != null && <span className="badge badge--accent">{entry.rating}/10</span>}
        {entry.platform        && <span className="badge">{entry.platform}</span>}
        {entry.latest_status_date && (
          <span className="media-entry__updated">Updated {entry.latest_status_date}</span>
        )}
      </div>

      {entry.notes  && <><p className="expand-panel__label">Notes</p><Markdown>{entry.notes}</Markdown></>}
      {entry.review && <><p className="expand-panel__label">Review</p><Markdown>{entry.review}</Markdown></>}

      <p className="expand-panel__label">Additional Notes</p>
      {!loading && notes.length === 0 && (
        <p className="note-empty">No notes yet.</p>
      )}
      {!loading && notes.map(n => (
        <div key={n.id} className="media-note">
          <div className="media-note__header">
            <span className="media-note__date-badge">{formatMediumDate(n.note_date)}</span>
            <Button variant="ghost" size="icon" onClick={() => deleteNote(n.id)} title="Delete note">✕</Button>
          </div>
          <Markdown>{n.body_md}</Markdown>
        </div>
      ))}

      <div className="note-add-row">
        <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
          className="note-add-row__date" />
        <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note…" className="note-add-row__text"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }} />
        <Button size="sm" variant="accent" onClick={addNote} disabled={addingNote || !newNote.trim()}>
          {addingNote ? '…' : 'Add'}
        </Button>
      </div>

      <div className="note-add-actions">
        <Button size="sm" variant="ghost" onClick={onEdit}>✏️ Edit</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>✕ Close</Button>
      </div>
    </div>
  );
}

// ── Compact item row ──────────────────────────────────────────────────────────

function MediaItem({ entry, isExpanded, onToggle }: Readonly<{
  entry: MediaEntryDetail;
  isExpanded: boolean;
  onToggle: () => void;
}>) {
  return (
    <Button
      variant="ghost"
      className={`list-item${isExpanded ? ' list-item--expanded' : ''}`}
      onClick={onToggle}
    >
      <div className="list-item__body">
        <div className="list-item__title">{entry.title}</div>
        <div className="list-item__meta">
          {entry.creator && <span>{entry.creator}</span>}
          {entry.platform && <span>{entry.platform}</span>}
          {entry.latest_status_date && entry.current_status && (
            <span>{entry.current_status.status_name} · {entry.latest_status_date}</span>
          )}
        </div>
      </div>
      <div className="list-item__actions">
        {entry.rating != null && <span className="badge">{entry.rating}/10</span>}
        <span className="list-item__chevron">{isExpanded ? '▲' : '▼'}</span>
      </div>
    </Button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MediaClient({ entries, mediaTypes, mediaStatuses, statusTypeLinks }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [localEntries, setLocalEntries] = useState(entries);
  useEffect(() => { setLocalEntries(entries); }, [entries]);

  const typeTabs = mediaTypes.map(t => ({ id: String(t.id), label: capitalize(t.type_name) }));
  const [activeTypeId, setActiveTypeId] = useState<string>(mediaTypes[0] ? String(mediaTypes[0].id) : '');
  const [expandedId,   setExpandedId]   = useState<number | null>(null);
  const [editEntry,    setEditEntry]    = useState<MediaEntryDetail | null>(null);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);

  const openAdd = () => {
    setEditEntry(null);
    setForm({ ...EMPTY_FORM, media_type_id: activeTypeId });
    setShowAddForm(true); setExpandedId(null);
  };

  const openEdit = (e: MediaEntryDetail) => {
    setEditEntry(e); setForm(entryToForm(e));
    setShowAddForm(true); setExpandedId(null);
  };

  const cancel = () => { setShowAddForm(false); setEditEntry(null); };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        media_type_id: Number.parseInt(form.media_type_id),
        title:         form.title,
        rating:        form.rating  ? Number.parseInt(form.rating)  : null,
        platform:      form.platform || null,
        creator:       form.creator  || null,
        notes:         form.notes    || null,
        review:        form.review   || null,
      };

      let entryId: number;
      if (editEntry) {
        await updateMediaEntry(supabase, editEntry.id, payload);
        entryId = editEntry.id;
      } else {
        const data = await createMediaEntry(supabase, payload);
        if (!data) throw new Error('Failed to create entry');
        entryId = (data as { id: number }).id;
      }

      const statusChanged = !editEntry || String(editEntry.current_status?.id ?? '') !== form.status_id;
      if (form.status_id && statusChanged) {
        await addMediaStatusEntry(supabase,
          entryId, Number.parseInt(form.status_id), form.status_date || localTodayISO());
      }

      router.refresh();
      cancel();
    } finally { setSaving(false); }
  }, [supabase, form, editEntry, router]);

  const remove = useCallback(async () => {
    if (!editEntry || !confirm('Delete this entry?')) return;
    setSaving(true);
    try { await deleteMediaEntry(supabase, editEntry.id); router.refresh(); cancel(); }
    finally { setSaving(false); }
  }, [supabase, editEntry, router]);

  const filtered = localEntries.filter(e => String(e.media_type_id) === activeTypeId);

  const handleTypeChange = (id: string) => {
    setActiveTypeId(id);
    setExpandedId(null);
    setShowAddForm(false);
  };

  const toggleExpandedEntry = (id: number) => setExpandedId(prev => prev === id ? null : id);
  const closeExpandedEntry  = () => setExpandedId(null);
  const makeEntryToggle = (id: number)           => () => toggleExpandedEntry(id);
  const makeEntryEdit   = (e: MediaEntryDetail)  => () => openEdit(e);

  const renderEntryRow = (entry: MediaEntryDetail) => {
    const isExpanded = expandedId === entry.id;
    return (
      <div key={entry.id}>
        <MediaItem entry={entry} isExpanded={isExpanded} onToggle={makeEntryToggle(entry.id)} />
        {isExpanded && (
          <MediaItemView entry={entry} onEdit={makeEntryEdit(entry)} onClose={closeExpandedEntry} />
        )}
      </div>
    );
  };

  const grouped   = mediaStatuses.reduce<Record<string, MediaEntryDetail[]>>((acc, s) => {
    const inStatus = filtered.filter(e => e.current_status?.id === s.id);
    if (inStatus.length > 0) acc[s.status_name] = inStatus;
    return acc;
  }, {});
  const ungrouped = filtered.filter(e => e.current_status == null);

  return (
    <div>
      <div className="media-header">
        <div className="media-header__tabs">
          <TabBar tabs={typeTabs} active={activeTypeId} onChange={handleTypeChange} />
        </div>
        <div className="media-header__action">
          <Button variant="accent" size="sm" onClick={openAdd}>+ Add</Button>
        </div>
      </div>

      {showAddForm && (
        <MediaForm
          form={form} setForm={setForm}
          mediaTypes={mediaTypes} mediaStatuses={mediaStatuses} statusTypeLinks={statusTypeLinks}
          onSave={save} onCancel={cancel}
          onDelete={editEntry ? remove : undefined}
          editId={editEntry?.id} saving={saving}
        />
      )}

      {filtered.length === 0 && !showAddForm && <p className="empty-state">Nothing here yet.</p>}

      {Object.entries(grouped).map(([statusName, items]) => (
        <div key={statusName} className="media-section-group">
          <div className="section-divider">
            {STATUS_EMOJI[statusName] ?? ''} {capitalize(statusName)} ({items.length})
          </div>
          {items.map(renderEntryRow)}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div className="media-section-group">
          <div className="section-divider">No status</div>
          {ungrouped.map(renderEntryRow)}
        </div>
      )}
    </div>
  );
}
