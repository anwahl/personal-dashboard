'use client';

/**
 * LastTimeSettings — manage last_time_media, last_time_boolean, last_time_custom.
 * Used in both /last-time page and Settings → Last Time tab.
 */

import { useState, useCallback } from 'react';
import {
  getLastTimeMedia,    createLastTimeMedia,    deleteLastTimeMedia,
  getLastTimeBoolean,  createLastTimeBoolean,  deleteLastTimeBoolean,
  getLastTimeCustom,   createLastTimeCustom,   deleteLastTimeCustom,
} from '@/lib/dal/last-time';
import { createClient }   from '@/lib/supabase/client';
import { Button }         from '@/components/ui/Button';
import { ConfirmButton }  from '@/components/ui/ConfirmButton';
import type {
  DailyTrackableRow,
  MediaTypeRow,
  MediaGenreRow,
  MediaStatusRow,
  LastTimeMediaRow,
  LastTimeBooleanRow,
  LastTimeCustomRow,
} from '@/types/schema';

// ── Display item augmented with a computed label + subtitle ───────────────────

interface DisplayItem {
  id:       number;
  label:    string;
  subtitle?: string;
}

interface Props {
  trackables:    DailyTrackableRow[];
  mediaTypes:    MediaTypeRow[];
  mediaGenres:   MediaGenreRow[];
  mediaStatuses: MediaStatusRow[];
}

// ── Shared row ────────────────────────────────────────────────────────────────

function ItemRow({ item, onDelete }: Readonly<{ item: DisplayItem; onDelete: (id: number) => void }>) {
  return (
    <div className="manage-item">
      <span className="manage-item__name">{item.label}</span>
      {item.subtitle && <span className="badge badge--muted">{item.subtitle}</span>}
      <ConfirmButton
        onConfirm={() => onDelete(item.id)}
        size="icon"
        confirmLabel="?"
        label="✕"
        showCancel={false}
      />
    </div>
  );
}

// ── Media section ─────────────────────────────────────────────────────────────

function MediaSection({ mediaTypes, mediaGenres, mediaStatuses }: Readonly<Pick<Props, 'mediaTypes' | 'mediaGenres' | 'mediaStatuses'>>) {
  const supabase = createClient();
  const [items,    setItems]    = useState<DisplayItem[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [open,     setOpen]     = useState(false);
  const [label,    setLabel]    = useState('');
  const [emoji,    setEmoji]    = useState('');
  const [typeId,   setTypeId]   = useState('');
  const [genreId,  setGenreId]  = useState('');
  const [statusId, setStatusId] = useState('');
  const [saving,   setSaving]   = useState(false);

  const canAdd = label.trim() && (typeId || genreId || statusId);

  const buildSubtitle = useCallback((
    tId: number | null, gId: number | null, sId: number | null,
  ): string => {
    const typeMap   = new Map(mediaTypes.map(t => [t.id, t.type_name]));
    const genreMap  = new Map(mediaGenres.map(g => [g.id, g.genre_name]));
    const statusMap = new Map(mediaStatuses.map(s => [s.id, s.status_name]));
    return [
      tId ? typeMap.get(tId)   : null,
      gId ? genreMap.get(gId)  : null,
      sId ? statusMap.get(sId) : null,
    ].filter(Boolean).join(' · ');
  }, [mediaTypes, mediaGenres, mediaStatuses]);

  const load = useCallback(async () => {
    const data = await getLastTimeMedia(supabase);
    setItems((data ?? []).map((row: LastTimeMediaRow) => ({
      id:       row.id,
      label:    row.label,
      subtitle: buildSubtitle(row.type_id, row.genre_id, row.status_id),
    })));
    setLoaded(true);
  }, [supabase, buildSubtitle]);

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const add = async () => {
    if (!canAdd || saving) return;
    setSaving(true);
    try {
      const payload = {
        label:      label.trim(),
        emoji:      emoji || null,
        type_id:    typeId   ? Number.parseInt(typeId)   : null,
        genre_id:   genreId  ? Number.parseInt(genreId)  : null,
        status_id:  statusId ? Number.parseInt(statusId) : null,
        sort_order: items.length,
      };
      const data = await createLastTimeMedia(supabase, payload);
      if (data) {
        setItems(prev => [...prev, {
          id:       (data as LastTimeMediaRow).id,
          label:    payload.label,
          subtitle: buildSubtitle(payload.type_id, payload.genre_id, payload.status_id),
        }]);
      }
      setLabel(''); setEmoji(''); setTypeId(''); setGenreId(''); setStatusId('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await deleteLastTimeMedia(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        🎬 Media {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          <p className="last-time-section__desc">
            Combine any filters: type + genre + status. Example: "Last horror game I finished"
            = Type: Game, Genre: Horror, Status: finished. At least one filter is required.
          </p>
          {items.map(item => <ItemRow key={item.id} item={item} onDelete={remove} />)}

          <div className="last-time-media-form">
            <div className="last-time-media-form__row">
              <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
                placeholder="Emoji" className="last-time-media-form__emoji" />
              <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Label (required) e.g. Last horror game finished"
                className="last-time-media-form__label"
                onKeyDown={e => { if (e.key === 'Enter') add(); }} />
            </div>
            <div className="last-time-media-form__row last-time-media-form__row--filters">
              <select value={typeId} onChange={e => setTypeId(e.target.value)} className="settings-select">
                <option value="">Any type…</option>
                {mediaTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
              </select>
              <select value={genreId} onChange={e => setGenreId(e.target.value)} className="settings-select">
                <option value="">Any genre…</option>
                {mediaGenres.map(g => <option key={g.id} value={g.id}>{g.genre_name}</option>)}
              </select>
              <select value={statusId} onChange={e => setStatusId(e.target.value)} className="settings-select">
                <option value="">Any status…</option>
                {mediaStatuses.map(s => <option key={s.id} value={s.id}>{s.status_name}</option>)}
              </select>
              <Button variant="accent" size="sm" onClick={add} disabled={!canAdd || saving}>
                + Add
              </Button>
            </div>
            {!canAdd && label.trim() && (
              <p className="last-time-media-form__hint">Select at least one filter (type, genre, or status).</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Boolean section ───────────────────────────────────────────────────────────

function BooleanSection({ trackables }: Readonly<Pick<Props, 'trackables'>>) {
  const supabase = createClient();
  const [items,   setItems]   = useState<DisplayItem[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [open,    setOpen]    = useState(false);
  const [trackId, setTrackId] = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    const data = await getLastTimeBoolean(supabase);
    setItems((data ?? []).map((row: LastTimeBooleanRow) => {
      const t = trackables.find(t => t.id === row.trackable_id);
      return {
        id:          row.id,
        label:       t ? `${t.emoji ?? ''} ${t.name}`.trim() : `#${row.trackable_id}`,
        trackable_id: row.trackable_id,
      };
    }));
    setLoaded(true);
  }, [supabase, trackables]);

  const linkedTrackableIds = new Set(
    (items as Array<DisplayItem & { trackable_id?: number }>).map(i => i.trackable_id)
  );

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const add = async () => {
    if (!trackId || saving) return;
    setSaving(true);
    try {
      const data = await createLastTimeBoolean(supabase, {
        trackable_id: Number.parseInt(trackId),
        emoji:        null,
        sort_order:   items.length,
      });
      if (data) {
        const t = trackables.find(t => t.id === Number.parseInt(trackId));
        setItems(prev => [...prev, {
          id:          (data as LastTimeBooleanRow).id,
          label:       t ? `${t.emoji ?? ''} ${t.name}`.trim() : `#${(data as LastTimeBooleanRow).id}`,
          trackable_id: (data as LastTimeBooleanRow).trackable_id,
        }]);
      }
      setTrackId('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await deleteLastTimeBoolean(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        ✅ Habits {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          <p className="last-time-section__desc">
            Track "last time I did [habit]". Date is derived automatically from logged habit entries.
          </p>
          {items.map(item => <ItemRow key={item.id} item={item} onDelete={remove} />)}
          <div className="manage-add-row">
            <select
              value={trackId}
              onChange={e => setTrackId(e.target.value)}
              className="settings-select input--flex"
            >
              <option value="">Select habit…</option>
              {trackables
                .filter(t => !linkedTrackableIds.has(t.id))
                .map(t => (
                  <option key={t.id} value={t.id}>{t.emoji ?? ''} {t.name}</option>
                ))
              }
            </select>
            <Button variant="accent" size="sm" onClick={add} disabled={!trackId || saving}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Custom section ────────────────────────────────────────────────────────────

function CustomSection() {
  const supabase = createClient();
  const [items,  setItems]  = useState<DisplayItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open,   setOpen]   = useState(false);
  const [value,  setValue]  = useState('');
  const [emoji,  setEmoji]  = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getLastTimeCustom(supabase);
    setItems((data ?? []).map((row: LastTimeCustomRow) => ({
      id:    row.id,
      label: `${row.emoji ?? ''} ${row.custom_value}`.trim(),
    })));
    setLoaded(true);
  }, [supabase]);

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const add = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      const data = await createLastTimeCustom(supabase, {
        custom_value: value.trim(),
        emoji:        emoji || null,
        sort_order:   items.length,
      });
      if (data) {
        setItems(prev => [...prev, {
          id:    (data as LastTimeCustomRow).id,
          label: `${(data as LastTimeCustomRow).emoji ?? ''} ${(data as LastTimeCustomRow).custom_value}`.trim(),
        }]);
      }
      setValue(''); setEmoji('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await deleteLastTimeCustom(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        📌 Custom {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          <p className="last-time-section__desc">
            Any activity not tracked elsewhere. Log it manually with the ✓ button on the tracker.
          </p>
          {items.map(item => <ItemRow key={item.id} item={item} onDelete={remove} />)}
          <div className="manage-add-row">
            <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
              placeholder="Emoji" className="input--short" />
            <input type="text" value={value} onChange={e => setValue(e.target.value)}
              placeholder="Activity name…" className="input--flex"
              onKeyDown={e => { if (e.key === 'Enter') add(); }} />
            <Button variant="accent" size="sm" onClick={add} disabled={!value.trim() || saving}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LastTimeSettings({ trackables, mediaTypes, mediaGenres, mediaStatuses }: Readonly<Props>) {
  return (
    <div>
      <MediaSection mediaTypes={mediaTypes} mediaGenres={mediaGenres} mediaStatuses={mediaStatuses} />
      <BooleanSection trackables={trackables} />
      <CustomSection />
    </div>
  );
}
