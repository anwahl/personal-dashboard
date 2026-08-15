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
import { Button, Card, CardActions, CardBody, CardHeader, CardSection, CardSectionLabel, CardTitle, Chip, ChipGroup, ConfirmButton, InputField, Markdown, SubCard, SubCardBody } from '@/components/ui';
import { localTodayISO, formatShortDate } from '@/lib/utils/dates';
import type { MediaEntryDetail }  from '@/types/dal';
import type {
  MediaTypeRow, MediaStatusRow, MediaStatusEntryRow,
  MediaNoteRow, MediaStatusTypeLinkRow,
} from '@/types/schema';
import {
  MediaForm, MediaFormValues,
  entryToMediaFormValues,
  STATUS_EMOJI
} from './MediaForm';
import { Field, FieldActions, FieldGrid } from '../ui/Display';
import { capitalize } from '@/lib/utils/strings';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  entry:          MediaEntryDetail;
  statusHistory:  (MediaStatusEntryRow & { status: MediaStatusRow })[];
  mediaTypes:     MediaTypeRow[];
  mediaStatuses:  MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
}

// ── Main component ────────────────────────────────────────────────────────────

export function MediaDetailClient({
  entry: initial, statusHistory, mediaTypes, mediaStatuses, statusTypeLinks,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [entry]     = useState(initial);
  const [mode,      setMode]      = useState<'view' | 'edit'>('view');
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

  const handleSave = useCallback(async (values: MediaFormValues) => {
    setSaving(true); setSaveError('');
    try {
      await updateMediaEntry(supabase, entry.id, {
        title:    values.title.trim(),
        creator:  values.creator.trim()  || null,
        platform: values.platform.trim() || null,
        rating:   values.rating          || null,
        notes:    values.notes.trim()    || null,
        review:   values.review.trim()   || null,
      });

      const statusChanged = String(entry.current_status?.id ?? '') !== values.status_id;
      if (values.status_id && statusChanged) {
        await addMediaStatusEntry(supabase,
          entry.id, Number.parseInt(values.status_id), values.status_date || localTodayISO());
      }

      router.refresh();
      setMode('view');
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  }, [supabase, router, entry]);

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    await deleteMediaEntry(supabase, entry.id);
    router.push('/media');
  }, [supabase, entry.id, router]);

  // ── View mode ────────────────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{entry.title}</CardTitle>
          <CardActions>
            <Button variant="action" size='sm' onClick={() => setMode('edit')}>
              ✏️ Edit
            </Button>
            <ConfirmButton variant='danger' onConfirm={handleDelete}>✕ Delete</ConfirmButton>
          </CardActions>
        </CardHeader>
        <CardBody>
          <CardSection>
            <CardSectionLabel>Info</CardSectionLabel>
            {/* Meta badges */}
            <ChipGroup>
              <Chip fixed={true}>{capitalize(entry.media_type.type_name)}</Chip>
              {entry.current_status && (
                <Chip fixed={true} variant="accent">
                  {STATUS_EMOJI[entry.current_status.status_name] ?? ''} {entry.current_status.status_name}
                </Chip>
              )}
              {entry.rating != null && <Chip fixed={true} variant="accent">{entry.rating}/10</Chip>}
              {entry.platform && <Chip fixed={true}>{entry.platform}</Chip>}
              {entry.latest_status_date && (
                <Chip fixed={true}>{formatShortDate(entry.latest_status_date)}</Chip>
              )}
            </ChipGroup>
            {/*TODO Description etc from api */}
          </CardSection>

          {(entry.notes || entry.review) && (
            <CardSection>
              <CardSectionLabel>Thoughts...</CardSectionLabel>
              {/* Notes */}
              {entry.notes && (
                <Field label='Notes'>
                  <Markdown>{entry.notes}</Markdown>
                </Field>
              )}

              {/* Review */}
              {entry.review && (
                <Field label='Review'>
                  <Markdown>{entry.review}</Markdown>
                </Field>
              )}
            </CardSection>
          )}

          {/* Status history */}
          {statusHistory.length > 0 && (
            <CardSection>
                <CardSectionLabel>Status History</CardSectionLabel>
                {statusHistory.map(sh => (
                  <span key={sh.id}>
                    <FieldGrid>
                      <Field label='Date' value={formatShortDate(sh.status_date)} />
                      <Field label='Status' 
                        value={(STATUS_EMOJI[sh.status.status_name] ?? '') + (sh.status.status_name)} />
                    </FieldGrid>
                  </span>
                ))}
            </CardSection>
          )}
          
          {/* Timed media notes */}
          <SubCard>
            <SubCardBody>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader> 
              <CardSection>
                <CardSectionLabel>New Note</CardSectionLabel>
                <FieldGrid>
                  <InputField label='Date' id='new-note-date'>
                    <input id='new-note-date' type="date" value={noteDate}
                        onChange={e => setNoteDate(e.target.value)} />
                  </InputField>
                  <InputField label='Note' id='new-note-text'>
                    <textarea
                      id='new-note-text'
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Add a note…"
                      className="textarea--short"
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
                    />
                  </InputField>
                </FieldGrid>
                <FieldActions alignment='right'>
                  <Button size="sm" variant="action-alt"
                    onClick={addNote}
                    disabled={addingNote || !newNote.trim()}>
                    {addingNote ? '…' : 'Add'}
                  </Button>
                </FieldActions>
              </CardSection>
              <CardSection>
                <CardSectionLabel>Previous Notes</CardSectionLabel>
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
                    <div className="detail-page__body-markdown">
                      <Markdown>{n.body_md}</Markdown>
                    </div>
                  </div>
                ))}
              </CardSection>
            </SubCardBody>
          </SubCard>
        </CardBody>
      </Card>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────

  return (
    <MediaForm
      initialValues={entryToMediaFormValues(entry)}
      mediaTypes={mediaTypes}
      mediaStatuses={mediaStatuses}
      statusTypeLinks={statusTypeLinks}
      saving={saving}
      saveError={saveError}
      onSave={handleSave}
      onCancel={() => setMode('view')}
    />
  );
}