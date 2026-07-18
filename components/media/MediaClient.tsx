'use client';

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import { Button }                from '@/components/ui/Button';
import { Chip, ChipGroup }       from '@/components/ui/Chip';
import { TabBar }                from '@/components/ui/Controls';
import { InputField }            from '@/components/ui/Display';
import type { MediaEntryDetail } from '@/types/dal';
import type { MediaTypeRow, MediaStatusRow, MediaGenreRow } from '@/types/schema';

interface Props {
  entries:      MediaEntryDetail[];
  mediaTypes:   MediaTypeRow[];
  mediaStatuses: MediaStatusRow[];
  genres:       MediaGenreRow[];
}

const STATUS_EMOJI: Record<string, string> = {
  watching: '▶️', reading: '📖', playing: '🎮', finished: '✅',
  dropped: '⛔', 'want-to': '🔖', paused: '⏸️',
};

interface FormState {
  media_type_id: string;
  title:         string;
  status_id:     string;
  rating:        string;
  started_date:  string;
  finished_date: string;
  platform:      string;
  creator:       string;
  notes:         string;
  review:        string;
}

const EMPTY_FORM: FormState = {
  media_type_id: '', title: '', status_id: '', rating: '',
  started_date: '', finished_date: '', platform: '', creator: '', notes: '', review: '',
};

function entryToForm(e: MediaEntryDetail): FormState {
  return {
    media_type_id: String(e.media_type_id),
    title:         e.title,
    status_id:     e.status_id   ? String(e.status_id)  : '',
    rating:        e.rating      ? String(e.rating)      : '',
    started_date:  e.started_date  ?? '',
    finished_date: e.finished_date ?? '',
    platform:      e.platform      ?? '',
    creator:       e.creator       ?? '',
    notes:         e.notes         ?? '',
    review:        e.review        ?? '',
  };
}

// ── Media item ────────────────────────────────────────────────────────────────

function MediaItem({ entry, onEdit }: { entry: MediaEntryDetail; onEdit: () => void }) {
  return (
    <div className="list-item" onClick={onEdit}>
      <div className="list-item__body">
        <div className="list-item__title">{entry.title}</div>
        <div className="list-item__meta">
          {entry.creator && <span>{entry.creator}</span>}
          {entry.platform && <span>{entry.platform}</span>}
          {entry.started_date && !entry.finished_date && <span>Started {entry.started_date}</span>}
          {entry.finished_date && <span>Finished {entry.finished_date}</span>}
        </div>
      </div>
      <div className="list-item__actions">
        {entry.rating != null && (
          <span className="badge">{entry.rating}/10</span>
        )}
      </div>
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function MediaForm({ form, setForm, mediaTypes, mediaStatuses, onSave, onCancel, onDelete, editId, saving }: {
  form:         FormState;
  setForm:      React.Dispatch<React.SetStateAction<FormState>>;
  mediaTypes:   MediaTypeRow[];
  mediaStatuses: MediaStatusRow[];
  onSave:       () => void;
  onCancel:     () => void;
  onDelete?:    () => void;
  editId?:      number;
  saving:       boolean;
}) {
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
      <p style={{ fontWeight: 700, marginBottom: 14 }}>{editId ? 'Edit entry' : 'Add entry'}</p>
      <div className="field-grid">
        <InputField label="Type" id="med-type">
          <select id="med-type" value={form.media_type_id} onChange={e => set('media_type_id', e.target.value)}>
            <option value="">Select type…</option>
            {mediaTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
          </select>
        </InputField>
        <InputField label="Status" id="med-status">
          <select id="med-status" value={form.status_id} onChange={e => set('status_id', e.target.value)}>
            <option value="">Select status…</option>
            {mediaStatuses.map(s => <option key={s.id} value={s.id}>{STATUS_EMOJI[s.status_name] ?? ''} {s.status_name}</option>)}
          </select>
        </InputField>
      </div>
      <InputField label="Title" id="med-title">
        <input id="med-title" type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Title…" autoFocus />
      </InputField>
      <div className="field-grid">
        <InputField label="Creator / Author / Director" id="med-creator">
          <input id="med-creator" type="text" value={form.creator} onChange={e => set('creator', e.target.value)} />
        </InputField>
        <InputField label="Platform" id="med-platform">
          <input id="med-platform" type="text" value={form.platform} onChange={e => set('platform', e.target.value)} placeholder="Netflix, Kindle…" />
        </InputField>
      </div>
      <div className="field-grid field-grid--3">
        <InputField label="Rating (1-10)" id="med-rating">
          <input id="med-rating" type="number" min={1} max={10} value={form.rating} onChange={e => set('rating', e.target.value)} />
        </InputField>
        <InputField label="Started" id="med-started">
          <input id="med-started" type="date" value={form.started_date} onChange={e => set('started_date', e.target.value)} />
        </InputField>
        <InputField label="Finished" id="med-finished">
          <input id="med-finished" type="date" value={form.finished_date} onChange={e => set('finished_date', e.target.value)} />
        </InputField>
      </div>
      <InputField label="Notes" id="med-notes">
        <textarea id="med-notes" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: 60 }} placeholder="Notes while consuming…" />
      </InputField>
      <InputField label="Review" id="med-review">
        <textarea id="med-review" value={form.review} onChange={e => set('review', e.target.value)} style={{ minHeight: 60 }} placeholder="Thoughts after finishing…" />
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

// ── Main ──────────────────────────────────────────────────────────────────────

export function MediaClient({ entries, mediaTypes, mediaStatuses, genres }: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [activeTypeId, setActiveTypeId] = useState<string>(
    mediaTypes[0] ? String(mediaTypes[0].id) : ''
  );
  const [showForm,   setShowForm]   = useState(false);
  const [editEntry,  setEditEntry]  = useState<MediaEntryDetail | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const openNew  = () => { setEditEntry(null); setForm({ ...EMPTY_FORM, media_type_id: activeTypeId }); setShowForm(true); };
  const openEdit = (e: MediaEntryDetail) => { setEditEntry(e); setForm(entryToForm(e)); setShowForm(true); };
  const cancel   = () => { setShowForm(false); setEditEntry(null); };

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
      if (editEntry) {
        await supabase.from('media_entries').update(payload).eq('id', editEntry.id);
      } else {
        await supabase.from('media_entries').insert(payload);
      }
      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, form, editEntry, router]);

  const remove = useCallback(async () => {
    if (!editEntry || !confirm('Delete this entry?')) return;
    setSaving(true);
    try {
      await supabase.from('media_entries').delete().eq('id', editEntry.id);
      router.refresh();
      cancel();
    } finally {
      setSaving(false);
    }
  }, [supabase, editEntry, router]);

  // Build tabs from media types
  const typeTabs = mediaTypes.map(t => ({ id: String(t.id), label: t.type_name }));

  // Filter entries by active type
  const filtered = entries.filter(e => String(e.media_type_id) === activeTypeId);

  // Group by status
  const grouped = mediaStatuses.reduce<Record<string, MediaEntryDetail[]>>((acc, s) => {
    const inStatus = filtered.filter(e => e.status_id === s.id);
    if (inStatus.length > 0) acc[s.status_name] = inStatus;
    return acc;
  }, {});

  const ungrouped = filtered.filter(e => e.status_id == null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <TabBar tabs={typeTabs} active={activeTypeId} onChange={setActiveTypeId} />
        <Button variant="accent" size="sm" onClick={openNew}>+ Add</Button>
      </div>

      {showForm && (
        <MediaForm
          form={form} setForm={setForm}
          mediaTypes={mediaTypes} mediaStatuses={mediaStatuses}
          onSave={save} onCancel={cancel}
          onDelete={editEntry ? remove : undefined}
          editId={editEntry?.id}
          saving={saving}
        />
      )}

      {filtered.length === 0 && !showForm && (
        <p className="empty-state">Nothing here yet. Add something above.</p>
      )}

      {Object.entries(grouped).map(([statusName, items]) => (
        <div key={statusName} style={{ marginBottom: 20 }}>
          <div className="section-divider">
            {STATUS_EMOJI[statusName] ?? ''} {statusName} ({items.length})
          </div>
          {items.map(e => <MediaItem key={e.id} entry={e} onEdit={() => openEdit(e)} />)}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-divider">No status</div>
          {ungrouped.map(e => <MediaItem key={e.id} entry={e} onEdit={() => openEdit(e)} />)}
        </div>
      )}
    </div>
  );
}
