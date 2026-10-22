'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient }           from '@/lib/supabase/client';
import { Button, TabBar, Markdown, CardActions, CardSection, CardSectionLabel, ExpandPanel, ChipGroup, Chip, Field, ExpandCard, EmptyState, DateField, TextAreaField } from '@/components/ui';
import { getMediaNotes, createMediaNote, deleteMediaNote } from '@/lib/dal/media';
import type { MediaEntryDetail }  from '@/types/dal';
import { formatShortDate, localTodayISO } from '@/lib/utils/dates';
import type {
  MediaTypeRow, MediaStatusRow,
  MediaNoteRow, MediaStatusTypeLinkRow,
} from '@/types/schema';
import { MediaDialog, STATUS_EMOJI } from './MediaForm';
import { FieldActions } from '../ui/Display';
import { capitalize } from '@/lib/utils/strings';

interface Props {
  entries:         MediaEntryDetail[];
  mediaTypes:      MediaTypeRow[];
  mediaStatuses:   MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
}

function MediaItem({ entry }: Readonly<{
  entry: MediaEntryDetail;
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
      <ExpandPanel title={entry.title}
       shownChildren = {
          <ChipGroup className='chip-group-right chip-group-sm chip-group-faint'>
            {entry.latest_status_date && entry.current_status && (
              <Chip fixed={true}>{entry.current_status.status_name} · {entry.latest_status_date}</Chip>
            )}
            {entry.rating != null && <Chip fixed={true} variant='accent'>{entry.rating}/10</Chip>}
          </ChipGroup>
       }
       hiddenChildren = {
          <>
          <ChipGroup className='chip-group-right'>
            {entry.creator && <Chip fixed={true}>{entry.creator}</Chip>}
            {entry.platform && <Chip fixed={true}>{entry.platform}</Chip>}
          </ChipGroup>

          <CardActions>
            <Button size="sm" variant="ghost" href={`/media/${entry.id}`}>→ View</Button>
          </CardActions>

          {(entry.notes || entry.review) && (
            <CardSection>
              <CardSectionLabel>Thoughts...</CardSectionLabel>
              {entry.notes  && (
                <Field label='Notes'>
                  <Markdown>{entry.notes}</Markdown>
                </Field>
              )}
              {entry.review && (
                <Field label='Review'>
                  <Markdown>{entry.review}</Markdown>
                </Field>
              )}
            </CardSection>
          )}
          {!loading && (
            <CardSection>
              <CardSectionLabel>Previous Notes</CardSectionLabel>
              {notes.length === 0 && <p className="note-empty">No notes yet.</p>}
              {notes.map(n => (
                <div key={n.id} className="media-note">
                  <div className="media-note__header">
                    <span className="media-note__date-badge">{formatShortDate(n.note_date)}</span>
                    <Button variant="ghost" size="icon" onClick={() => deleteNote(n.id)}
                      title="Delete note" aria-label="Delete note">✕</Button>
                  </div>
                  <div className="detail-page__body-markdown">
                    <Markdown>{n.body_md}</Markdown>
                  </div>
                </div>
              ))}
            </CardSection>
          )}

          <CardSection>
            <CardSectionLabel>New Note</CardSectionLabel>
            <DateField label='Date' value={noteDate} onChange={setNoteDate} />
            <TextAreaField label='Note' value={newNote} onChange={setNewNote}
              placeholder="Add a note…"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
              size="short" />
            <FieldActions alignment='right'>
              <Button size="sm" variant="action-alt"
                onClick={addNote}
                busy={addingNote} disabled={!newNote.trim()}>
                Add
              </Button>
            </FieldActions>
          </CardSection>
        </>
    } />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MediaClient({ entries, mediaTypes, mediaStatuses, statusTypeLinks }: Readonly<Props>) {
  const [localEntries, setLocalEntries] = useState(entries);
  useEffect(() => { setLocalEntries(entries); }, [entries]);

  const typeTabs = mediaTypes.map(t => ({ id: String(t.id), label: capitalize(t.type_name) }));
  const [activeTypeId, setActiveTypeId] = useState<string>(mediaTypes[0] ? String(mediaTypes[0].id) : '');
  const [addOpen,      setAddOpen]      = useState(false);

  const filtered = localEntries.filter(e => String(e.media_type_id) === activeTypeId);


  const grouped   = mediaStatuses.reduce<Record<string, MediaEntryDetail[]>>((acc, s) => {
    const inStatus = filtered.filter(e => e.current_status?.id === s.id);
    if (inStatus.length > 0) acc[s.status_name] = inStatus;
    return acc;
  }, {});
  const ungrouped = filtered.filter(e => e.current_status == null);

  return (
    <>
      <TabBar tabs={typeTabs} active={activeTypeId} onChange={setActiveTypeId} />
      <FieldActions docked alignment='right'>
        <Button variant="accent" onClick={() => setAddOpen(true)}>+ New Media</Button>
      </FieldActions>
      <MediaDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultTypeId={activeTypeId}
        mediaTypes={mediaTypes}
        mediaStatuses={mediaStatuses}
        statusTypeLinks={statusTypeLinks}
      />

      {filtered.length === 0 && <EmptyState>Nothing here yet.</EmptyState>}

      {Object.entries(grouped).map(([statusName, items]) => (
          <ExpandCard key={statusName} title={`${STATUS_EMOJI[statusName] ?? ''} ${capitalize(statusName)} (${items.length})`}
            hiddenChildren = {
              <>
                {items.map(entry => {
                  return <MediaItem key={entry.id} entry={entry} />
                })}
              </>
            }
          />
      ))}

      {ungrouped.length > 0 && (
        <ExpandCard title='No status'
            hiddenChildren = {
              <>
                {ungrouped.map(entry => {
                  return <MediaItem key={entry.id} entry={entry} />
                })}
              </> 
            } />
      )}
    </>
  );
}