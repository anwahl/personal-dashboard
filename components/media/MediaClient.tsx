'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';
import { Button, TabBar, Markdown, Card, CardHeader, CardTitle, CardActions, CardBody, CardSection, CardSectionLabel, ExpandPanel, ChipGroup, Chip, Field, ExpandCard } from '@/components/ui';
import {
  getMediaNotes, createMediaNote, deleteMediaNote,
  updateMediaEntry, createMediaEntry, addMediaStatusEntry, deleteMediaEntry,
} from '@/lib/dal/media';
import type { MediaEntryDetail }  from '@/types/dal';
import { formatMediumDate, formatShortDate, localTodayISO } from '@/lib/utils/dates';
import type {
  MediaTypeRow, MediaStatusRow,
  MediaNoteRow, MediaStatusTypeLinkRow,
} from '@/types/schema';
import {
  MediaForm, MediaFormValues,
  emptyMediaFormValues, entryToMediaFormValues,
  STATUS_EMOJI, capitalize,
} from './MediaForm';
import { FieldActions, FieldGrid, InputField } from '../ui/Display';

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
          {!loading && notes.length === 0 && <p className="note-empty">No notes yet.</p>}
          {!loading && notes.map(n => (
            <CardSection>
              <CardSectionLabel>Previous Notes</CardSectionLabel>
              {!loading && notes.length === 0 && <p className="note-empty">No notes yet.</p>}
              {!loading && notes.map(n => (
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
          ))}

          <CardSection>
            <CardSectionLabel>New Note</CardSectionLabel>
            <FieldGrid>
              <InputField label='Date' id={`${entry.id}-new-note-date`}>
                <input id={`${entry.id}-new-note-date`} type="date" value={noteDate}
                    onChange={e => setNoteDate(e.target.value)} />
              </InputField>
              <InputField label='Note' id={`${entry.id}-new-note-text`}>
                <textarea
                  id={`${entry.id}-new-note-text`}
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
        </>
    } />
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
  const [editEntry,    setEditEntry]    = useState<MediaEntryDetail | null>(null);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [saving,       setSaving]       = useState(false);

  const openAdd = () => {
    setEditEntry(null);
    setShowAddForm(true);
  };

  const cancel = () => { setShowAddForm(false); setEditEntry(null); };

  const handleSave = useCallback(async (values: MediaFormValues) => {
    setSaving(true);
    try {
      const payload = {
        media_type_id: Number.parseInt(values.media_type_id),
        title:         values.title,
        rating:        values.rating   || null,
        platform:      values.platform || null,
        creator:       values.creator  || null,
        notes:         values.notes    || null,
        review:        values.review   || null,
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

      const statusChanged = !editEntry || String(editEntry.current_status?.id ?? '') !== values.status_id;
      if (values.status_id && statusChanged) {
        await addMediaStatusEntry(supabase,
          entryId, Number.parseInt(values.status_id), values.status_date || localTodayISO());
      }

      router.refresh();
      cancel();
    } finally { setSaving(false); }
  }, [supabase, editEntry, router]);

  const handleDelete = useCallback(async () => {
    if (!editEntry || !confirm('Delete this entry?')) return;
    setSaving(true);
    try {
      await deleteMediaEntry(supabase, editEntry.id);
      router.refresh();
      cancel();
    } finally { setSaving(false); }
  }, [supabase, editEntry, router]);

  const filtered = localEntries.filter(e => String(e.media_type_id) === activeTypeId);

  const handleTypeChange = (id: string) => {
    setActiveTypeId(id);
    setShowAddForm(false);
  };

  const grouped   = mediaStatuses.reduce<Record<string, MediaEntryDetail[]>>((acc, s) => {
    const inStatus = filtered.filter(e => e.current_status?.id === s.id);
    if (inStatus.length > 0) acc[s.status_name] = inStatus;
    return acc;
  }, {});
  const ungrouped = filtered.filter(e => e.current_status == null);

  return (
    <>
      <TabBar tabs={typeTabs} active={activeTypeId} onChange={handleTypeChange} />
      <span className='pad'>
        <FieldActions alignment='right'>
          <Button variant="accent" size="sm" onClick={openAdd}>+ Add</Button>
        </FieldActions>
      </span>
      {showAddForm && (
          <MediaForm
            key={editEntry?.id ?? 'new'}
            initialValues={editEntry
              ? entryToMediaFormValues(editEntry)
              : { ...emptyMediaFormValues, media_type_id: activeTypeId }}
            mediaTypes={mediaTypes}
            mediaStatuses={mediaStatuses}
            statusTypeLinks={statusTypeLinks}
            showTypeSelector
            enableSearch
            saving={saving}
            saveLabel={editEntry ? 'Update' : 'Add'}
            onSave={handleSave}
            onCancel={cancel}
            onDelete={editEntry ? handleDelete : undefined}
          />
      )}

      {filtered.length === 0 && !showAddForm && <p className="empty-state">Nothing here yet.</p>}

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