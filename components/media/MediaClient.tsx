'use client';

/**
 * MediaClient — the Media page: a tab per type, entries grouped by status.
 * Each entry is one row (title links to its page; ⋯ → Edit… / Add note…).
 * `bare` (inside a LayoutCard): each status is a collapsible panel instead
 * of its own card.
 */

import { useState, useEffect } from 'react';
import { Button, TabBar, ExpandCard, ExpandPanel, EmptyState, ListItem, RowMenu } from '@/components/ui';
import type { MediaEntryDetail }  from '@/types/dal';
import { formatShortDate } from '@/lib/utils/dates';
import type { MediaTypeRow, MediaStatusRow, MediaStatusTypeLinkRow } from '@/types/schema';
import { MediaDialog, MediaNoteDialog, STATUS_EMOJI } from './MediaForm';
import { FieldActions } from '../ui/Display';
import { capitalize } from '@/lib/utils/strings';

interface Props {
  entries:         MediaEntryDetail[];
  mediaTypes:      MediaTypeRow[];
  mediaStatuses:   MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
  /** No cards of its own (inside a LayoutCard). */
  bare?:           boolean;
}

/** One entry: title (links to its page), status · date · rating · creator
 *  underneath, and a ⋯ menu to edit it or add a note. */
function MediaItem({ entry, onEdit, onAddNote }: Readonly<{
  entry:     MediaEntryDetail;
  onEdit:    (entry: MediaEntryDetail) => void;
  onAddNote: (entry: MediaEntryDetail) => void;
}>) {
  return (
    <ListItem
      href={`/media/${entry.id}`}
      title={entry.title}
      meta={
        <>
          {entry.latest_status_date && <span>{formatShortDate(entry.latest_status_date)}</span>}
          {entry.rating != null && <span>⭐ {entry.rating}/10</span>}
          {entry.creator  && <span>{entry.creator}</span>}
          {entry.platform && <span>{entry.platform}</span>}
        </>
      }
      trailing={
        <RowMenu
          label={entry.title}
          items={[
            { label: 'Edit…',     onSelect: () => onEdit(entry) },
            { label: 'Add note…', onSelect: () => onAddNote(entry) },
          ]}
        />
      }
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MediaClient({ entries, mediaTypes, mediaStatuses, statusTypeLinks, bare = false }: Readonly<Props>) {
  const StatusGroup = bare ? ExpandPanel : ExpandCard;
  const [localEntries, setLocalEntries] = useState(entries);
  useEffect(() => { setLocalEntries(entries); }, [entries]);

  const typeTabs = mediaTypes.map(t => ({ id: String(t.id), label: capitalize(t.type_name) }));
  const [activeTypeId, setActiveTypeId] = useState<string>(mediaTypes[0] ? String(mediaTypes[0].id) : '');
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editEntry,    setEditEntry]    = useState<MediaEntryDetail | null>(null);
  const [noteEntry,    setNoteEntry]    = useState<MediaEntryDetail | null>(null);
  const openAdd  = () => { setEditEntry(null); setDialogOpen(true); };
  const openEdit = (e: MediaEntryDetail) => { setEditEntry(e); setDialogOpen(true); };
  const rows = (items: MediaEntryDetail[]) => items.map(entry => (
    <MediaItem key={entry.id} entry={entry} onEdit={openEdit} onAddNote={setNoteEntry} />
  ));

  const filtered = localEntries.filter(e => String(e.media_type_id) === activeTypeId);


  const grouped   = mediaStatuses.reduce<Record<string, MediaEntryDetail[]>>((acc, s) => {
    const inStatus = filtered.filter(e => e.current_status?.id === s.id);
    if (inStatus.length > 0) acc[s.status_name] = inStatus;
    return acc;
  }, {});
  const ungrouped = filtered.filter(e => e.current_status == null);

  return (
    <>
      <TabBar label="Media types" tabs={typeTabs} active={activeTypeId} onChange={setActiveTypeId} />
      <FieldActions docked alignment='right'>
        <Button variant="primary" onClick={openAdd}>+ New Media</Button>
      </FieldActions>
      <MediaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editEntry}
        defaultTypeId={activeTypeId}
        mediaTypes={mediaTypes}
        mediaStatuses={mediaStatuses}
        statusTypeLinks={statusTypeLinks}
      />
      <MediaNoteDialog
        open={noteEntry !== null}
        onOpenChange={o => { if (!o) setNoteEntry(null); }}
        entry={noteEntry}
      />

      {filtered.length === 0 && <EmptyState>Nothing here yet.</EmptyState>}

      {Object.entries(grouped).map(([statusName, items]) => (
          <StatusGroup key={statusName} title={`${STATUS_EMOJI[statusName] ?? ''} ${capitalize(statusName)} (${items.length})`}
            hiddenChildren={rows(items)}
          />
      ))}

      {ungrouped.length > 0 && (
        <StatusGroup title='No status'
            hiddenChildren={rows(ungrouped)} />
      )}
    </>
  );
}