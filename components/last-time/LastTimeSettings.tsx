'use client';

/**
 * LastTimeSettings — manage last_time_media, last_time_boolean, last_time_custom.
 * Used in both /last-time page and Settings → Last Time tab.
 */

import { useState, useCallback } from 'react';
import {
  getLastTimeMedia, createLastTimeMedia, deleteLastTimeMedia,
  getLastTimeBoolean, createLastTimeBoolean, deleteLastTimeBoolean,
  getLastTimeCustom, createLastTimeCustom, deleteLastTimeCustom,
} from '@/lib/dal/last-time';
import { createClient }           from '@/lib/supabase/client';
import { Button }                 from '@/components/ui/Button';
import { ConfirmButton }          from '@/components/ui/ConfirmButton';

interface Props {
  trackables:    any[];   // boolean trackables
  mediaTypes:    any[];
  mediaGenres:   any[];
  mediaStatuses: any[];
}

function ItemRow({ item, onDelete }: Readonly<{ item: any; onDelete: (id: number) => void }>) {
  return (
    <div className="manage-item">
      <span className="manage-item__name">
        {item.emoji ?? ''} {item.label}
      </span>
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
  const [items,    setItems]    = useState<any[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [open,     setOpen]     = useState(false);
  // Form fields
  const [label,    setLabel]    = useState('');
  const [emoji,    setEmoji]    = useState('');
  const [typeId,   setTypeId]   = useState('');
  const [genreId,  setGenreId]  = useState('');
  const [statusId, setStatusId] = useState('');
  const [saving,   setSaving]   = useState(false);

  const canAdd = label.trim() && (typeId || genreId || statusId);

  const load = useCallback(async () => {
    const data = await getLastTimeMedia(supabase);
    const typeMap   = new Map(mediaTypes.map((t: any) => [t.id, t.type_name]));
    const genreMap  = new Map(mediaGenres.map((g: any) => [g.id, g.genre_name]));
    const statusMap = new Map(mediaStatuses.map((s: any) => [s.id, s.status_name]));
    setItems((data ?? []).map((row: any) => {
      const parts = [
        row.type_id   ? typeMap.get(row.type_id)     : null,
        row.genre_id  ? genreMap.get(row.genre_id)   : null,
        row.status_id ? statusMap.get(row.status_id) : null,
      ].filter(Boolean);
      return { ...row, subtitle: parts.join(' · ') };
    }));
    setLoaded(true);
  }, [supabase, mediaTypes, mediaGenres, mediaStatuses]);

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const add = async () => {
    if (!canAdd || saving) return;
    setSaving(true);
    try {
      const payload = {
        label:     label.trim(),
        emoji:     emoji || null,
        type_id:   typeId   ? Number.parseInt(typeId)   : null,
        genre_id:  genreId  ? Number.parseInt(genreId)  : null,
        status_id: statusId ? Number.parseInt(statusId) : null,
        sort_order: items.length,
      };
      const data = await createLastTimeMedia(supabase, payload);
      if (data) {
        const typeMap   = new Map(mediaTypes.map((t: any) => [t.id, t.type_name]));
        const genreMap  = new Map(mediaGenres.map((g: any) => [g.id, g.genre_name]));
        const statusMap = new Map(mediaStatuses.map((s: any) => [s.id, s.status_name]));
        const parts = [
          payload.type_id   ? typeMap.get(payload.type_id)     : null,
          payload.genre_id  ? genreMap.get(payload.genre_id)   : null,
          payload.status_id ? statusMap.get(payload.status_id) : null,
        ].filter(Boolean);
        setItems(prev => [...prev, { ...data, subtitle: parts.join(' · ') }]);
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
                {mediaTypes.map((t: any) => <option key={t.id} value={t.id}>{t.type_name}</option>)}
              </select>
              <select value={genreId} onChange={e => setGenreId(e.target.value)} className="settings-select">
                <option value="">Any genre…</option>
                {mediaGenres.map((g: any) => <option key={g.id} value={g.id}>{g.genre_name}</option>)}
              </select>
              <select value={statusId} onChange={e => setStatusId(e.target.value)} className="settings-select">
                <option value="">Any status…</option>
                {mediaStatuses.map((s: any) => <option key={s.id} value={s.id}>{s.status_name}</option>)}
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
  const [items,   setItems]   = useState<any[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [open,    setOpen]    = useState(false);
  const [trackId, setTrackId] = useState('');
  const [emoji,   setEmoji]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const linkedIds = new Set(items.map((i: any) => i.trackable_id));

  const load = useCallback(async () => {
    const data = await getLastTimeBoolean(supabase);
    setItems((data ?? []).map((row: any) => {
      const t = trackables.find((t: any) => t.id === row.trackable_id);
      return { ...row, label: t ? `${t.emoji ?? ''} ${t.name}`.trim() : `#${row.trackable_id}` };
    }));
    setLoaded(true);
  }, [supabase, trackables]);

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const add = async () => {
    if (!trackId || saving) return;
    setSaving(true);
    try {
      const data = await createLastTimeBoolean(supabase, { trackable_id: Number.parseInt(trackId), emoji: emoji || null, sort_order: items.length });
      if (data) {
        const t = trackables.find((t: any) => t.id === Number.parseInt(trackId));
        setItems(prev => [...prev, { ...data, label: t ? `${t.emoji ?? ''} ${t.name}`.trim() : `#${data.id}` }]);
      }
      setTrackId(''); setEmoji('');
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
            <select value={trackId} onChange={e => setTrackId(e.target.value)} className="settings-select" style={{ flex: 1 }}>
              <option value="">Select habit…</option>
              {trackables.filter((t: any) => !linkedIds.has(t.id)).map((t: any) => (
                <option key={t.id} value={t.id}>{t.emoji ?? ''} {t.name}</option>
              ))}
            </select>
            <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
              placeholder="Override emoji" style={{ width: 80 }} />
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
  const [items,  setItems]  = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open,   setOpen]   = useState(false);
  const [value,  setValue]  = useState('');
  const [emoji,  setEmoji]  = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getLastTimeCustom(supabase);
    setItems((data ?? []).map((row: any) => ({ ...row, label: `${row.emoji ?? ''} ${row.custom_value}`.trim() })));
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
      const data = await createLastTimeCustom(supabase, { custom_value: value.trim(), emoji: emoji || null, sort_order: items.length });
      if (data) setItems(prev => [...prev, { ...data, label: `${(data as any).emoji ?? ''} ${(data as any).custom_value}`.trim() }]);
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
              placeholder="Emoji" style={{ width: 48 }} />
            <input type="text" value={value} onChange={e => setValue(e.target.value)}
              placeholder="Activity name…" style={{ flex: 1 }}
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
