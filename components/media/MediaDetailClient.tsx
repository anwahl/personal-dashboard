'use client';

/**
 * components/media/MediaDetailClient.tsx
 *
 * Full detail page for a media entry.
 * View mode: title, meta, notes, review, status history, timed media notes.
 * Edit mode: inline form for all editable fields.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';
import {
  getMediaNotes, createMediaNote, deleteMediaNote,
  updateMediaEntry, addMediaStatusEntry, deleteMediaEntry,
} from '@/lib/dal/media';
import { Button }                 from '@/components/ui/Button';
import { ConfirmButton }          from '@/components/ui/ConfirmButton';
import { InputField } from '@/components/ui/Display';
import { Markdown }               from '@/components/ui/Markdown';
import { localTodayISO, formatShortDate } from '@/lib/utils/dates';
import type { MediaEntryDetail }  from '@/types/dal';
import type {
  MediaTypeRow, MediaStatusRow, MediaStatusEntryRow,
  MediaNoteRow, MediaStatusTypeLinkRow,
} from '@/types/schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_EMOJI: Record<string, string> = {
  watching: '▶️', reading: '📖', playing: '🎮', finished: '✅',
  dropped: '⛔', 'want-to': '🔖', paused: '⏸️',
};

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function validStatusesForType(
  mediaTypeId: number,
  allStatuses:  MediaStatusRow[],
  links:        MediaStatusTypeLinkRow[]
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  entry:          MediaEntryDetail;
  statusHistory:  (MediaStatusEntryRow & { status: MediaStatusRow })[];
  mediaTypes:     MediaTypeRow[];
  mediaStatuses:  MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  title:     string;
  creator:   string;
  platform:  string;
  rating:    string;
  notes:     string;
  review:    string;
  status_id:   string;
  status_date: string;
}

function entryToForm(e: MediaEntryDetail): FormState {
  return {
    title:       e.title,
    creator:     e.creator   ?? '',
    platform:    e.platform  ?? '',
    rating:      e.rating    != null ? String(e.rating) : '',
    notes:       e.notes     ?? '',
    review:      e.review    ?? '',
    status_id:   e.current_status ? String(e.current_status.id) : '',
    status_date: e.latest_status_date ?? localTodayISO(),
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function MediaDetailClient({
  entry: initial, statusHistory, mediaTypes, mediaStatuses, statusTypeLinks,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [entry]     = useState(initial);
  const [mode,      setMode]      = useState<'view' | 'edit'>('view');
  const [form,      setForm]      = useState<FormState>(() => entryToForm(initial));
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Media notes ─────────────────────────────────────────────────────────────

  const [notes,      setNotes]      = useState<MediaNoteRow[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [newNote,    setNewNote]    = useState('');
  const [noteDate,   setNoteDate]   = useState(localTodayISO());
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    getMediaNotes(supabase, entry.id).then(notes => { setNotes(notes); setNotesLoaded(true); });
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

  // ── Save ────────────────────────────────────────────────────────────────────

  const save = useCallback(async () => {
    setSaving(true); setSaveError('');
    try {
      const payload = {
        title:    form.title.trim(),
        creator:  form.creator.trim()  || null,
        platform: form.platform.trim() || null,
        rating:   form.rating          ? Number.parseInt(form.rating) : null,
        notes:    form.notes.trim()    || null,
        review:   form.review.trim()   || null,
      };

      await updateMediaEntry(supabase, entry.id, payload);

      // Log new status if changed
      const statusChanged = String(entry.current_status?.id ?? '') !== form.status_id;
      if (form.status_id && statusChanged) {
        await addMediaStatusEntry(supabase, {
          media_entry_id: entry.id,
          status_id:      Number.parseInt(form.status_id),
          status_date:    form.status_date || localTodayISO(),
        });
      }

      router.refresh();
      setMode('view');
    } catch (e: any) {
      setSaveError(e.message ?? 'Save failed');
    } finally { setSaving(false); }
  }, [supabase, router, entry, form]);

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    await deleteMediaEntry(supabase, entry.id);
    router.push('/media');
  }, [supabase, entry.id, router]);

  // ── View mode ────────────────────────────────────────────────────────────────

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));
  const filteredStatuses = validStatusesForType(entry.media_type_id, mediaStatuses, statusTypeLinks);

  if (mode === 'view') {
    return (
      <>
        {/* Header */}
        <div className="detail-page__header">
          <div>
            <h2 className="detail-page__title">{entry.title}</h2>
            {entry.creator && <p className="detail-page__subtitle">by {entry.creator}</p>}
          </div>
          <div className="detail-page__actions">
            <Button variant="ghost" size="sm" onClick={() => { setForm(entryToForm(entry)); setMode('edit'); }}>
              ✏️ Edit
            </Button>
            <ConfirmButton onConfirm={handleDelete}>✕ Delete</ConfirmButton>
          </div>
        </div>

        {/* Meta badges */}
        <div className="media-detail-meta">
          <span className="badge">{capitalize(entry.media_type.type_name)}</span>
          {entry.current_status && (
            <span className="badge badge--accent">
              {STATUS_EMOJI[entry.current_status.status_name] ?? ''} {entry.current_status.status_name}
            </span>
          )}
          {entry.rating != null && <span className="badge badge--accent">{entry.rating}/10</span>}
          {entry.platform && <span className="badge">{entry.platform}</span>}
          {entry.latest_status_date && (
            <span className="badge">{formatShortDate(entry.latest_status_date)}</span>
          )}
        </div>

        {/* Notes */}
        {entry.notes && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Notes</p>
            <Markdown>{entry.notes}</Markdown>
          </div>
        )}

        {/* Review */}
        {entry.review && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Review</p>
            <Markdown>{entry.review}</Markdown>
          </div>
        )}

        {/* Status history */}
        {statusHistory.length > 0 && (
          <div className="detail-page__body">
            <p className="detail-page__body-label">Status History</p>
            <div className="media-status-history">
              {statusHistory.map(sh => (
                <div key={sh.id} className="media-status-event">
                  <span className="media-status-event__date">{formatShortDate(sh.status_date)}</span>
                  <span className="badge">
                    {STATUS_EMOJI[sh.status.status_name] ?? ''} {sh.status.status_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timed media notes */}
        <div className="detail-page__body">
          <p className="detail-page__body-label">Notes</p>
          {!notesLoaded && <p className="empty-state">Loading…</p>}
          {notesLoaded && notes.length === 0 && (
            <p className="empty-state">No notes yet.</p>
          )}
          {notes.map(n => (
            <div key={n.id} className="media-note">
              <div className="media-note__header">
                <span className="media-note__date-badge">{formatShortDate(n.note_date)}</span>
                <button type="button" className="media-note__delete"
                  onClick={() => deleteNote(n.id)} title="Delete note">✕</button>
              </div>
              <Markdown>{n.body_md}</Markdown>
            </div>
          ))}

          {/* Add note form */}
          <div className="manage-add-row" style={{ marginTop: 10, alignItems: 'flex-start' }}>
            <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
              style={{ width: 140 }} />
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note…"
              className="textarea--short"
              style={{ flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
            />
            <Button size="sm" variant="accent" onClick={addNote}
              disabled={addingNote || !newNote.trim()}>
              {addingNote ? '…' : 'Add'}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="detail-page__header">
        <h2 className="detail-page__title">Edit: {entry.title}</h2>
      </div>

      <InputField label="Title" id="md-title">
        <input id="md-title" type="text" value={form.title}
          onChange={e => set('title', e.target.value)} />
      </InputField>

      <div className="field-grid">
        <InputField label="Status" id="md-status">
          <select id="md-status" value={form.status_id} onChange={e => set('status_id', e.target.value)}>
            <option value="">No status</option>
            {filteredStatuses.map(s => (
              <option key={s.id} value={s.id}>
                {STATUS_EMOJI[s.status_name] ?? ''} {s.status_name}
              </option>
            ))}
          </select>
        </InputField>
        {form.status_id && (
          <InputField label="Status date" id="md-status-date">
            <input id="md-status-date" type="date" value={form.status_date}
              onChange={e => set('status_date', e.target.value)} />
          </InputField>
        )}
      </div>

      <div className="field-grid">
        <InputField label="Creator / Author / Director" id="md-creator">
          <input id="md-creator" type="text" value={form.creator}
            onChange={e => set('creator', e.target.value)} />
        </InputField>
        <InputField label="Platform" id="md-platform">
          <input id="md-platform" type="text" value={form.platform}
            onChange={e => set('platform', e.target.value)} />
        </InputField>
      </div>

      <InputField label="Rating (1–10)" id="md-rating">
        <input id="md-rating" type="number" min={1} max={10} value={form.rating}
          onChange={e => set('rating', e.target.value)} style={{ maxWidth: 100 }} />
      </InputField>

      <InputField label="Notes (while consuming)" id="md-notes">
        <textarea id="md-notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </InputField>

      <InputField label="Review (after finishing)" id="md-review">
        <textarea id="md-review" value={form.review} onChange={e => set('review', e.target.value)} />
      </InputField>

      {saveError && <p className="save-status save-status--error">{saveError}</p>}

      <div className="page-actions">
        <Button variant="accent" onClick={save} disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
      </div>
    </>
  );
}
