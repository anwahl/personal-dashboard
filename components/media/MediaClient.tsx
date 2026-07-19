'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';
import { Button }                 from '@/components/ui/Button';
import { TabBar }                 from '@/components/ui/Controls';
import { InputField }             from '@/components/ui/Display';
import { Markdown }               from '@/components/ui/Markdown';
import type { MediaEntryDetail }  from '@/types/dal';
import type { MediaTypeRow, MediaStatusRow, MediaGenreRow, MediaNoteRow } from '@/types/schema';
import type { MediaSearchResult } from '@/app/api/media-search/route';

interface Props {
  entries:       MediaEntryDetail[];
  mediaTypes:    MediaTypeRow[];
  mediaStatuses: MediaStatusRow[];
  genres:        MediaGenreRow[];
}

const STATUS_EMOJI: Record<string, string> = {
  watching: '▶️', reading: '📖', playing: '🎮', finished: '✅',
  dropped: '⛔', 'want-to': '🔖', paused: '⏸️',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  media_type_id: string; title: string; status_id: string; rating: string;
  started_date: string; finished_date: string; platform: string;
  creator: string; notes: string; review: string;
}

const EMPTY_FORM: FormState = {
  media_type_id: '', title: '', status_id: '', rating: '',
  started_date: '', finished_date: '', platform: '', creator: '', notes: '', review: '',
};

function entryToForm(e: MediaEntryDetail): FormState {
  return {
    media_type_id: String(e.media_type_id),
    title:         e.title,
    status_id:     e.status_id   ? String(e.status_id)   : '',
    rating:        e.rating      ? String(e.rating)       : '',
    started_date:  e.started_date  ?? '',
    finished_date: e.finished_date ?? '',
    platform:      e.platform      ?? '',
    creator:       e.creator       ?? '',
    notes:         e.notes         ?? '',
    review:        e.review        ?? '',
  };
}

// ── Search panel ──────────────────────────────────────────────────────────────

function SearchPanel({ mediaTypeSlug, onSelect }: {
  mediaTypeSlug: string;
  onSelect: (r: MediaSearchResult) => void;
}) {
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
    } finally {
      setLoading(false);
    }
  }, [mediaTypeSlug]);

  const handleInput = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 400);
  };

  return (
    <div className="search-panel" style={{ marginBottom: 12 }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder={`Search ${capitalize(mediaTypeSlug)}…`}
          autoFocus
        />
        {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 4, display: 'block' }}>Searching…</span>}
      </div>
      {results.map(r => (
        <div key={r.external_id} className="search-result" onClick={() => onSelect(r)}>
          <div>
            <div className="search-result__title">{r.title}</div>
            <div className="search-result__meta">
              {r.creator && <span>{r.creator} · </span>}
              {r.year    && <span>{r.year} · </span>}
              {r.platform && <span>{r.platform}</span>}
            </div>
          </div>
        </div>
      ))}
      {query.trim() && !loading && results.length === 0 && (
        <div style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-faint)' }}>
          No results found.
        </div>
      )}
    </div>
  );
}

// ── Media form ────────────────────────────────────────────────────────────────

function MediaForm({ form, setForm, mediaTypes, mediaStatuses, onSave, onCancel, onDelete, editId, saving }: {
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
  mediaTypes: MediaTypeRow[]; mediaStatuses: MediaStatusRow[];
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
  editId?: number; saving: boolean;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const activeType = mediaTypes.find(t => String(t.id) === form.media_type_id);

  const applySearchResult = (r: MediaSearchResult) => {
    setForm(p => ({
      ...p,
      title:        r.title,
      creator:      r.creator  ?? p.creator,
      started_date: r.year ? `${r.year}-01-01` : p.started_date,
      platform:     r.platform ?? p.platform,
    }));
    setShowSearch(false);
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
      <p style={{ fontWeight: 700, margin: '0 0 14px' }}>{editId ? 'Edit entry' : 'Add entry'}</p>

      <div className="field-grid">
        <InputField label="Type" id="mf-type">
          <select id="mf-type" value={form.media_type_id} onChange={e => { set('media_type_id', e.target.value); setShowSearch(false); }}>
            <option value="">Select type…</option>
            {mediaTypes.map(t => <option key={t.id} value={t.id}>{capitalize(t.type_name)}</option>)}
          </select>
        </InputField>
        <InputField label="Status" id="mf-status">
          <select id="mf-status" value={form.status_id} onChange={e => set('status_id', e.target.value)}>
            <option value="">Select status…</option>
            {mediaStatuses.map(s => <option key={s.id} value={s.id}>{STATUS_EMOJI[s.status_name] ?? ''} {s.status_name}</option>)}
          </select>
        </InputField>
      </div>

      {/* Search button (only shown when type is selected) */}
      {activeType && !showSearch && (
        <div style={{ marginBottom: 10 }}>
          <Button size="sm" variant="ghost" onClick={() => setShowSearch(true)}>
            🔍 Search and Pull from {capitalize(activeType.type_name)} database…
          </Button>
        </div>
      )}

      {showSearch && activeType && (
        <SearchPanel
          mediaTypeSlug={activeType.type_name}
          onSelect={applySearchResult}
        />
      )}

      <InputField label="Title" id="mf-title">
        <input id="mf-title" type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Title…" />
      </InputField>
      <div className="field-grid">
        <InputField label="Creator / Author / Director" id="mf-creator">
          <input id="mf-creator" type="text" value={form.creator} onChange={e => set('creator', e.target.value)} />
        </InputField>
        <InputField label="Platform" id="mf-platform">
          <input id="mf-platform" type="text" value={form.platform} onChange={e => set('platform', e.target.value)} placeholder="Netflix, Kindle…" />
        </InputField>
      </div>
      <div className="field-grid field-grid--3">
        <InputField label="Rating (1-10)" id="mf-rating">
          <input id="mf-rating" type="number" min={1} max={10} value={form.rating} onChange={e => set('rating', e.target.value)} />
        </InputField>
        <InputField label="Started" id="mf-started">
          <input id="mf-started" type="date" value={form.started_date} onChange={e => set('started_date', e.target.value)} />
        </InputField>
        <InputField label="Finished" id="mf-finished">
          <input id="mf-finished" type="date" value={form.finished_date} onChange={e => set('finished_date', e.target.value)} />
        </InputField>
      </div>
      <InputField label="Notes (while consuming)" id="mf-notes">
        <textarea id="mf-notes" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: 60 }} />
      </InputField>
      <InputField label="Review (after finishing)" id="mf-review">
        <textarea id="mf-review" value={form.review} onChange={e => set('review', e.target.value)} style={{ minHeight: 60 }} />
      </InputField>

      <div style={{ display: 'flex', gap: 8 }}>
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

function MediaItemView({ entry, onEdit, onClose }: {
  entry: MediaEntryDetail; onEdit: () => void; onClose: () => void;
}) {
  const supabase = createClient();
  const [notes,     setNotes]     = useState<MediaNoteRow[]>([]);
  const [newNote,   setNewNote]   = useState('');
  const [noteDate,  setNoteDate]  = useState(localTodayISO());
  const [addingNote,setAddingNote]= useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    supabase.from('media_notes').select('*')
      .eq('media_entry_id', entry.id)
      .order('note_date', { ascending: false })
      .then(({ data }) => { setNotes((data ?? []) as MediaNoteRow[]); setLoadingNotes(false); });
  }, [entry.id]);

  const addNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { data } = await supabase.from('media_notes')
        .insert({ media_entry_id: entry.id, note_date: noteDate, body_md: newNote.trim() })
        .select().single();
      if (data) setNotes(prev => [data as MediaNoteRow, ...prev]);
      setNewNote('');
    } finally { setAddingNote(false); }
  }, [supabase, entry.id, noteDate, newNote]);

  const deleteNote = useCallback(async (id: number) => {
    await supabase.from('media_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, [supabase]);

  function fmtNoteDate(d: string) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <div className="expand-panel">
      {/* Core fields */}
      {entry.creator && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>by {entry.creator}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {entry.status && <span className="badge">{STATUS_EMOJI[entry.status.status_name] ?? ''} {entry.status.status_name}</span>}
        {entry.rating != null && <span className="badge badge--accent">{entry.rating}/10</span>}
        {entry.platform && <span className="badge">{entry.platform}</span>}
        {entry.started_date  && <span style={{ fontSize: '0.76rem', color: 'var(--text-faint)' }}>Started {entry.started_date}</span>}
        {entry.finished_date && <span style={{ fontSize: '0.76rem', color: 'var(--text-faint)' }}>Finished {entry.finished_date}</span>}
      </div>

      {entry.notes  && <><p className="expand-panel__label">Notes</p><Markdown>{entry.notes}</Markdown></>}
      {entry.review && <><p className="expand-panel__label" style={{ marginTop: 8 }}>Review</p><Markdown>{entry.review}</Markdown></>}

      {/* Additional notes */}
      <p className="expand-panel__label" style={{ marginTop: 14 }}>Additional Notes</p>
      {!loadingNotes && notes.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: 8 }}>
          No notes yet.
        </p>
      )}
      {!loadingNotes && notes.map(n => (
        <div key={n.id} className="media-note">
          <div className="media-note__header">
            <span className="media-note__date-badge">{fmtNoteDate(n.note_date)}</span>
            <button
              type="button"
              className="media-note__delete"
              onClick={() => deleteNote(n.id)}
              title="Delete note"
            >
              ✕
            </button>
          </div>
          <Markdown>{n.body_md}</Markdown>
        </div>
      ))}

      {/* Add note */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 8 }}>
        <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ width: 140 }} />
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note…"
          style={{ flex: 1, minHeight: 50, resize: 'vertical' }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
        />
        <Button size="sm" variant="accent" onClick={addNote} disabled={addingNote || !newNote.trim()}>
          {addingNote ? '…' : 'Add'}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button size="sm" variant="ghost" onClick={onEdit}>✏️ Edit</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>✕ Close</Button>
      </div>
    </div>
  );
}

// ── Compact media item row ────────────────────────────────────────────────────

function MediaItem({ entry, isExpanded, onToggle }: {
  entry: MediaEntryDetail; isExpanded: boolean; onToggle: () => void;
}) {
  return (
    <div
      className="list-item"
      onClick={onToggle}
      style={{ borderRadius: isExpanded ? 'var(--radius-sm) var(--radius-sm) 0 0' : undefined }}
    >
      <div className="list-item__body">
        <div className="list-item__title">{entry.title}</div>
        <div className="list-item__meta">
          {entry.creator  && <span>{entry.creator}</span>}
          {entry.platform && <span>{entry.platform}</span>}
          {entry.finished_date && <span>Finished {entry.finished_date}</span>}
          {!entry.finished_date && entry.started_date && <span>Started {entry.started_date}</span>}
        </div>
      </div>
      <div className="list-item__actions">
        {entry.rating != null && <span className="badge">{entry.rating}/10</span>}
        <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>{isExpanded ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MediaClient({ entries, mediaTypes, mediaStatuses, genres }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [localEntries, setLocalEntries] = useState(entries);
  useEffect(() => { setLocalEntries(entries); }, [entries]);

  // Capitalize tab names derived from DB
  const typeTabs = mediaTypes.map(t => ({ id: String(t.id), label: capitalize(t.type_name) }));

  const [activeTypeId, setActiveTypeId] = useState<string>(
    mediaTypes[0] ? String(mediaTypes[0].id) : ''
  );
  const [expandedId,  setExpandedId]  = useState<number | null>(null);
  const [editEntry,   setEditEntry]   = useState<MediaEntryDetail | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);

  const openAdd = () => {
    setEditEntry(null);
    setForm({ ...EMPTY_FORM, media_type_id: activeTypeId });
    setShowAddForm(true);
    setExpandedId(null);
  };

  const openEdit = (e: MediaEntryDetail) => {
    setEditEntry(e);
    setForm(entryToForm(e));
    setShowAddForm(true);
    setExpandedId(null);
  };

  const cancel = () => { setShowAddForm(false); setEditEntry(null); };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        media_type_id: parseInt(form.media_type_id),
        title:         form.title,
        status_id:     form.status_id    ? parseInt(form.status_id)    : null,
        rating:        form.rating       ? parseInt(form.rating)        : null,
        started_date:  form.started_date  || null,
        finished_date: form.finished_date || null,
        platform:      form.platform      || null,
        creator:       form.creator       || null,
        notes:         form.notes         || null,
        review:        form.review        || null,
      };
      if (editEntry) await supabase.from('media_entries').update(payload).eq('id', editEntry.id);
      else           await supabase.from('media_entries').insert(payload);
      router.refresh();
      cancel();
    } finally { setSaving(false); }
  }, [supabase, form, editEntry, router]);

  const remove = useCallback(async () => {
    if (!editEntry || !confirm('Delete this entry?')) return;
    setSaving(true);
    try {
      await supabase.from('media_entries').delete().eq('id', editEntry.id);
      router.refresh();
      cancel();
    } finally { setSaving(false); }
  }, [supabase, editEntry, router]);

  // Filter by active type
  const filtered = localEntries.filter(e => String(e.media_type_id) === activeTypeId);

  // Group by status
  const grouped = mediaStatuses.reduce<Record<string, MediaEntryDetail[]>>((acc, s) => {
    const inStatus = filtered.filter(e => e.status_id === s.id);
    if (inStatus.length > 0) acc[s.status_name] = inStatus;
    return acc;
  }, {});
  const ungrouped = filtered.filter(e => e.status_id == null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ flex: 1 }}>
          <TabBar tabs={typeTabs} active={activeTypeId} onChange={id => { setActiveTypeId(id); setExpandedId(null); setShowAddForm(false); }} />
        </div>
        <Button variant="accent" size="sm" onClick={openAdd} style={{ marginLeft: 8, flexShrink: 0 }}>+ Add</Button>
      </div>

      {showAddForm && (
        <MediaForm
          form={form} setForm={setForm}
          mediaTypes={mediaTypes} mediaStatuses={mediaStatuses}
          onSave={save} onCancel={cancel}
          onDelete={editEntry ? remove : undefined}
          editId={editEntry?.id} saving={saving}
        />
      )}

      {filtered.length === 0 && !showAddForm && (
        <p className="empty-state">Nothing here yet.</p>
      )}

      {Object.entries(grouped).map(([statusName, items]) => (
        <div key={statusName} style={{ marginBottom: 20 }}>
          <div className="section-divider">
            {STATUS_EMOJI[statusName] ?? ''} {capitalize(statusName)} ({items.length})
          </div>
          {items.map(e => (
            <div key={e.id}>
              <MediaItem
                entry={e}
                isExpanded={expandedId === e.id}
                onToggle={() => setExpandedId(prev => prev === e.id ? null : e.id)}
              />
              {expandedId === e.id && (
                <MediaItemView
                  entry={e}
                  onEdit={() => openEdit(e)}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-divider">No status</div>
          {ungrouped.map(e => (
            <div key={e.id}>
              <MediaItem
                entry={e}
                isExpanded={expandedId === e.id}
                onToggle={() => setExpandedId(prev => prev === e.id ? null : e.id)}
              />
              {expandedId === e.id && (
                <MediaItemView
                  entry={e}
                  onEdit={() => openEdit(e)}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
