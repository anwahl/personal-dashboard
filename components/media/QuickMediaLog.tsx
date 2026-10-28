'use client';

/**
 * QuickMediaLog — "Now Playing": in-progress media, grouped by type.
 *
 * Each row links to the entry's page; its ⋯ menu marks it finished or
 * dropped (the type's completed/abandoned statuses) or opens it in
 * MediaDialog. The ＋ in the header adds one, starting in progress.
 *
 * Used on the Hub and the Media page. `bare` drops the card and title (and
 * so the collapsing), for placing inside a LayoutCard.
 */

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addMediaStatusEntry } from '@/lib/dal/media';
import { useContextDate } from '@/components/sections/DayContext';
import { capitalize } from '@/lib/utils/strings';
import {
  AddButton, CardSection, CardSectionLabel, ExpandCard, EmptyState, ListItem, RowMenu, SectionCard,
} from '@/components/ui';
import type { MediaEntryDetail } from '@/types/dal';
import type { MediaTypeRow, MediaStatusRow, MediaStatusTypeLinkRow } from '@/types/schema';
import { MediaDialog, STATUS_EMOJI, validStatusesForType } from './MediaForm';

// ── NowPlayingItem ────────────────────────────────────────────────────────────

function NowPlayingItem({
  entry, allStatuses, statusTypeLinks, onStatusChange, onEdit,
}: Readonly<{
  entry:           MediaEntryDetail;
  allStatuses:     MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
  onStatusChange:  (entryId: number, statusId: number) => Promise<void>;
  onEdit:          (entry: MediaEntryDetail) => void;
}>) {
  const endStatuses = validStatusesForType(entry.media_type_id, allStatuses, statusTypeLinks)
    .filter(s => s.status_type === 'completed' || s.status_type === 'abandoned');

  const status = entry.current_status;
  return (
    <ListItem
      href={`/media/${entry.id}`}
      title={entry.title}
      meta={
        <>
          {status && <span>{STATUS_EMOJI[status.status_name] ?? ''} {status.status_name}</span>}
          {entry.creator && <span>{entry.creator}</span>}
        </>
      }
      trailing={
        <RowMenu
          label={entry.title}
          items={[
            ...endStatuses.map(s => ({
              label:    `${STATUS_EMOJI[s.status_name] ?? ''} ${capitalize(s.status_name)}`.trim(),
              onSelect: () => onStatusChange(entry.id, s.id),
            })),
            ...(endStatuses.length ? ['separator' as const] : []),
            { label: 'Edit…', onSelect: () => onEdit(entry) },
          ]}
        />
      }
    />
  );
}

// ── QuickMediaLog ─────────────────────────────────────────────────────────────

interface Props {
  initialEntries:  MediaEntryDetail[];
  mediaTypes:      MediaTypeRow[];
  mediaStatuses:   MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
  open?:           boolean;
  /** No card or title of its own (inside a LayoutCard). */
  bare?:           boolean;
}

export function QuickMediaLog({
  initialEntries, mediaTypes, mediaStatuses, statusTypeLinks, open = false, bare = false,
}: Readonly<Props>) {
  const supabase = createClient();
  // Finished/dropped are dated today, or a daily page's date when placed on one.
  const today    = useContextDate();
  const [entries, setEntries] = useState<MediaEntryDetail[]>(initialEntries);
  // Pick up entries added elsewhere (e.g. the dialog below) after a refresh.
  useEffect(() => { setEntries(initialEntries); }, [initialEntries]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry,  setEditEntry]  = useState<MediaEntryDetail | null>(null);
  const openAdd  = () => { setEditEntry(null); setDialogOpen(true); };
  const openEdit = (e: MediaEntryDetail) => { setEditEntry(e); setDialogOpen(true); };

  const inProgress = entries.filter(e => e.current_status?.status_type === 'in_progress');

  const grouped = mediaTypes.reduce<Record<string, MediaEntryDetail[]>>((acc, t) => {
    const forType = inProgress.filter(e => e.media_type_id === t.id);
    if (forType.length) acc[t.type_name] = forType;
    return acc;
  }, {});

  const handleStatusChange = useCallback(async (entryId: number, newStatusId: number) => {
    await addMediaStatusEntry(supabase, entryId, newStatusId, today);
    // Finished or dropped: it's no longer in progress.
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }, [supabase, today]);

  const addButton = <AddButton label="Add media" onClick={openAdd} />;
  const content = (
    <>
      {inProgress.length === 0 && <EmptyState>Nothing in progress.</EmptyState>}

      {Object.entries(grouped).map(([typeName, items]) => (
        <CardSection key={typeName}>
          <CardSectionLabel>{capitalize(typeName)} ({items.length})</CardSectionLabel>
          {items.map(e => (
            <NowPlayingItem key={e.id} entry={e}
              allStatuses={mediaStatuses} statusTypeLinks={statusTypeLinks}
              onStatusChange={handleStatusChange}
              onEdit={openEdit}
            />
          ))}
        </CardSection>
      ))}
    </>
  );

  return (
    <>
      {bare
        ? <SectionCard title="Now Playing" bare actions={addButton}>{content}</SectionCard>
        : <ExpandCard open={open} title={`🎬 Now Playing (${inProgress.length})`}
            actions={addButton} hiddenChildren={content} />}

      <MediaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editEntry}
        defaultTypeId={mediaTypes[0] ? String(mediaTypes[0].id) : ''}
        startInProgress
        mediaTypes={mediaTypes}
        mediaStatuses={mediaStatuses}
        statusTypeLinks={statusTypeLinks}
      />
    </>
  );
}
