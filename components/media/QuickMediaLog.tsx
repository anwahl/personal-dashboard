'use client';

/**
 * QuickMediaLog
 *
 * Two sections:
 *   1. Now Playing — in-progress media grouped by type, quick status update
 *   2. Quick Add  — compact form to add new media with type-aware status filter
 *
 * Reusable: Hub page (compact mode) and /media page (full mode).
 */

import { useState, useCallback, useEffect } from 'react';
import { createClient }              from '@/lib/supabase/client';
import { Button }                    from '@/components/ui/Button';
import { InputField }                from '@/components/ui/Display';
import type { MediaEntryDetail }     from '@/types/dal';
import type {
  MediaTypeRow, MediaStatusRow, MediaStatusTypeLinkRow,
} from '@/types/schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function validStatusesForType(
  mediaTypeId: number,
  allStatuses: MediaStatusRow[],
  links: MediaStatusTypeLinkRow[]
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

// ── NowPlayingItem ────────────────────────────────────────────────────────────

function NowPlayingItem({
  entry, allStatuses, statusTypeLinks, onStatusChange,
}: {
  entry: MediaEntryDetail;
  allStatuses: MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
  onStatusChange: (entryId: number, statusId: number) => Promise<void>;
}) {
  const [changing, setChanging] = useState(false);
  const validStatuses = validStatusesForType(entry.media_type_id, allStatuses, statusTypeLinks);
  const terminalStatuses = validStatuses.filter(s =>
    s.status_type === 'completed' || s.status_type === 'abandoned'
  );

  const change = async (statusId: number) => {
    setChanging(true);
    try { await onStatusChange(entry.id, statusId); }
    finally { setChanging(false); }
  };

  return (
    <div className="qml-item">
      <div className="qml-item__body">
        <span className="qml-item__title">{entry.title}</span>
        <span className="qml-item__meta">
          {STATUS_EMOJI[entry.current_status?.status_name ?? ''] ?? ''}
          {entry.current_status?.status_name}
          {entry.creator && ` · ${entry.creator}`}
        </span>
      </div>
      <div className="qml-item__actions">
        {terminalStatuses.map(s => (
          <Button key={s.id} variant="ghost" size="sm"
            onClick={() => change(s.id)} disabled={changing}
            title={s.status_name}>
            {STATUS_EMOJI[s.status_name] ?? s.status_name}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialEntries:  MediaEntryDetail[];
  mediaTypes:      MediaTypeRow[];
  mediaStatuses:   MediaStatusRow[];
  statusTypeLinks: MediaStatusTypeLinkRow[];
  compact?:        boolean;
}

// ── QuickMediaLog ─────────────────────────────────────────────────────────────

export function QuickMediaLog({
  initialEntries, mediaTypes, mediaStatuses, statusTypeLinks, compact = false,
}: Props) {
  const supabase = createClient();
  const [entries, setEntries]     = useState<MediaEntryDetail[]>(initialEntries);
  const [showAdd, setShowAdd]     = useState(false);

  // Quick add form state
  const [title,     setTitle]     = useState('');
  const [typeId,    setTypeId]    = useState(mediaTypes[0] ? String(mediaTypes[0].id) : '');
  const [statusId,  setStatusId]  = useState('');
  const [saving,    setSaving]    = useState(false);

  // Auto-select the first in_progress status for the selected type
  useEffect(() => {
    if (!typeId) return;
    const valid = validStatusesForType(Number(typeId), mediaStatuses, statusTypeLinks);
    const inProgress = valid.find(s => s.status_type === 'in_progress');
    if (inProgress) setStatusId(String(inProgress.id));
  }, [typeId, mediaStatuses, statusTypeLinks]);

  const inProgress = entries.filter(e => e.current_status?.status_type === 'in_progress');

  // Group by media type
  const grouped = mediaTypes.reduce<Record<string, MediaEntryDetail[]>>((acc, t) => {
    const forType = inProgress.filter(e => e.media_type_id === t.id);
    if (forType.length) acc[t.type_name] = forType;
    return acc;
  }, {});

  const handleStatusChange = useCallback(async (entryId: number, newStatusId: number) => {
    await supabase.from('media_status_entries').insert({
      media_entry_id: entryId,
      status_id:      newStatusId,
      status_date:    localTodayISO(),
    });
    // Remove from in-progress list (it's now completed or abandoned)
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }, [supabase]);

  const handleAdd = useCallback(async () => {
    if (!title.trim() || !typeId || saving) return;
    setSaving(true);
    try {
      const { data: entryData, error } = await supabase
        .from('media_entries')
        .insert({ title: title.trim(), media_type_id: parseInt(typeId) })
        .select().single();
      if (error || !entryData) throw new Error('Failed to create entry');

      if (statusId) {
        await supabase.from('media_status_entries').insert({
          media_entry_id: (entryData as any).id,
          status_id:      parseInt(statusId),
          status_date:    localTodayISO(),
        });
      }

      // Add to local list as in-progress if applicable
      const status = mediaStatuses.find(s => s.id === parseInt(statusId));
      if (status?.status_type === 'in_progress') {
        const mediaType = mediaTypes.find(t => t.id === parseInt(typeId))!;
        const newEntry: MediaEntryDetail = {
          ...(entryData as any),
          media_type:         mediaType,
          current_status:     status,
          latest_status_date: localTodayISO(),
          genre_ids:          [],
        };
        setEntries(prev => [...prev, newEntry]);
      }

      setTitle(''); setShowAdd(false);
    } finally { setSaving(false); }
  }, [supabase, title, typeId, statusId, mediaStatuses, mediaTypes, saving]);

  const validStatuses = typeId
    ? validStatusesForType(Number(typeId), mediaStatuses, statusTypeLinks)
    : mediaStatuses;

  return (
    <div className="quick-media-log">
      <div className="quick-media-log__header">
        <span className="quick-media-log__title">
          {compact ? '🎬 Now Playing' : '🎬 Now Playing'}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(s => !s)}>
          {showAdd ? '✕' : '+ Add'}
        </Button>
      </div>

      {showAdd && (
        <div className="qml-add-form">
          <div className="qml-add-form__row">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Title…" className="qml-add-form__title"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
            <select value={typeId} onChange={e => setTypeId(e.target.value)} className="settings-select">
              {mediaTypes.map(t => <option key={t.id} value={t.id}>{capitalize(t.type_name)}</option>)}
            </select>
            <select value={statusId} onChange={e => setStatusId(e.target.value)} className="settings-select">
              <option value="">No status</option>
              {validStatuses.map(s => (
                <option key={s.id} value={s.id}>
                  {STATUS_EMOJI[s.status_name] ?? ''} {s.status_name}
                </option>
              ))}
            </select>
            <Button variant="accent" size="sm" onClick={handleAdd} disabled={!title.trim() || saving}>
              {saving ? '…' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {inProgress.length === 0 && !showAdd && (
        <p className="empty-state" style={{ fontSize: '0.85rem' }}>Nothing in progress.</p>
      )}

      {Object.entries(grouped).map(([typeName, items]) => (
        <div key={typeName} className="qml-group">
          <div className="qml-group__label">{capitalize(typeName)}</div>
          {items.map(e => (
            <NowPlayingItem key={e.id} entry={e}
              allStatuses={mediaStatuses} statusTypeLinks={statusTypeLinks}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
