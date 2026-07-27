'use client';

/**
 * LastTimeSettings — manage last_time_media, last_time_boolean, last_time_custom.
 * Each section lazy-loads its items on first expand.
 */

import { useState, useCallback } from 'react';
import {
  getLastTimeMedia,    createLastTimeMedia,    updateLastTimeMedia,    deleteLastTimeMedia,
  getLastTimeBoolean,  createLastTimeBoolean,                          deleteLastTimeBoolean,
  getLastTimeCustom,   createLastTimeCustom,   updateLastTimeCustom,   deleteLastTimeCustom,
  updateLastTimeBooleanEmoji,
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

interface Props {
  trackables:    DailyTrackableRow[];
  mediaTypes:    MediaTypeRow[];
  mediaGenres:   MediaGenreRow[];
  mediaStatuses: MediaStatusRow[];
}

// ── Generic inline-edit row ───────────────────────────────────────────────────

interface EditRowProps {
  label:      string;
  subtitle?:  string;
  onDelete:   () => void;
  children:   React.ReactNode;   // edit fields, shown in edit mode
}

function ItemRow({
  label, subtitle, onDelete,
  children,
}: Readonly<EditRowProps>) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="manage-item">
      {editing ? (
        <div className="manage-item__edit-block">
          {children}
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Done</Button>
        </div>
      ) : (
        <>
          <span className="manage-item__name">
            {label}
            {subtitle && <span className="badge badge--muted">{subtitle}</span>}
          </span>
          <div className="manage-item__actions">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>✏️</Button>
            <ConfirmButton onConfirm={onDelete} size="sm">✕</ConfirmButton>
          </div>
        </>
      )}
    </div>
  );
}

// ── Media section ─────────────────────────────────────────────────────────────

function MediaSection({ mediaTypes, mediaGenres, mediaStatuses }: Readonly<Pick<Props, 'mediaTypes' | 'mediaGenres' | 'mediaStatuses'>>) {
  const supabase = createClient();
  const [items,    setItems]    = useState<LastTimeMediaRow[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [open,     setOpen]     = useState(false);
  const [label,    setLabel]    = useState('');
  const [emoji,    setEmoji]    = useState('');
  const [typeId,   setTypeId]   = useState('');
  const [genreId,  setGenreId]  = useState('');
  const [statusId, setStatusId] = useState('');
  const [saving,   setSaving]   = useState(false);

  const canAdd = label.trim() && (typeId || genreId || statusId);

  const typeMap   = new Map(mediaTypes.map(t => [t.id, t.type_name]));
  const genreMap  = new Map(mediaGenres.map(g => [g.id, g.genre_name]));
  const statusMap = new Map(mediaStatuses.map(s => [s.id, s.status_name]));

  const subtitle = (row: LastTimeMediaRow) =>
    [row.type_id ? typeMap.get(row.type_id) : null,
     row.genre_id ? genreMap.get(row.genre_id) : null,
     row.status_id ? statusMap.get(row.status_id) : null]
    .filter(Boolean).join(' · ');

  const load = useCallback(async () => {
    setItems(await getLastTimeMedia(supabase));
    setLoaded(true);
  }, [supabase]);

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
      setItems(prev => [...prev, data]);
      setLabel(''); setEmoji(''); setTypeId(''); setGenreId(''); setStatusId('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await deleteLastTimeMedia(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const update = async (id: number, patch: Partial<{ label: string; emoji: string | null }>) => {
    await updateLastTimeMedia(supabase, id, patch);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        🎬 Media {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          <p className="last-time-section__desc">
            Combine any filters: type + genre + status. At least one filter is required.
          </p>
          {items.map(item => (
            <ItemRow key={item.id} label={`${item.emoji ?? ''} ${item.label}`.trim()} subtitle={subtitle(item)} onDelete={() => remove(item.id)}>
              <input type="text" className="input--short" defaultValue={item.emoji ?? ''}
                placeholder="Emoji"
                onBlur={e => update(item.id, { emoji: e.target.value || null })} />
              <input type="text" className="input--flex" defaultValue={item.label}
                placeholder="Label…"
                onBlur={e => { if (e.target.value.trim()) update(item.id, { label: e.target.value.trim() }); }} />
            </ItemRow>
          ))}

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
              <Button variant="accent" size="sm" onClick={add} disabled={!canAdd || saving}>+ Add</Button>
            </div>
            {!canAdd && label.trim() && (
              <p className="last-time-media-form__hint">Select at least one filter.</p>
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
  const [items,   setItems]   = useState<LastTimeBooleanRow[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [open,    setOpen]    = useState(false);
  const [trackId, setTrackId] = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setItems(await getLastTimeBoolean(supabase));
    setLoaded(true);
  }, [supabase]);

  const linkedIds = new Set(items.map(i => i.trackable_id));

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
        emoji: null,
        sort_order: items.length,
      });
      setItems(prev => [...prev, data]);
      setTrackId('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await deleteLastTimeBoolean(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateEmoji = async (id: number, emoji: string | null) => {
    await updateLastTimeBooleanEmoji(supabase, id, emoji);
    setItems(prev => prev.map(i => i.id === id ? { ...i, emoji } : i));
  };

  const label = (row: LastTimeBooleanRow) => {
    const t = trackables.find(t => t.id === row.trackable_id);
    return `${row.emoji ?? t?.emoji ?? ''} ${t?.name ?? `#${row.trackable_id}`}`.trim();
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        ✅ Habits {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          {items.map(item => (
            <ItemRow key={item.id} label={label(item)} onDelete={() => remove(item.id)}>
              <input type="text" className="input--short" defaultValue={item.emoji ?? ''}
                placeholder="Emoji override"
                onBlur={e => updateEmoji(item.id, e.target.value || null)} />
              <span className="manage-item__name">
                {trackables.find(t => t.id === item.trackable_id)?.name ?? `#${item.trackable_id}`}
              </span>
            </ItemRow>
          ))}
          <div className="manage-add-row">
            <select value={trackId} onChange={e => setTrackId(e.target.value)}
              className="settings-select input--flex">
              <option value="">Select habit…</option>
              {trackables
                .filter(t => !linkedIds.has(t.id))
                .map(t => <option key={t.id} value={t.id}>{t.emoji ?? ''} {t.name}</option>)}
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
  const [items,  setItems]  = useState<LastTimeCustomRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open,   setOpen]   = useState(false);
  const [value,  setValue]  = useState('');
  const [emoji,  setEmoji]  = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setItems(await getLastTimeCustom(supabase));
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
        emoji: emoji || null,
        sort_order: items.length,
      });
      setItems(prev => [...prev, data]);
      setValue(''); setEmoji('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await deleteLastTimeCustom(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const update = async (id: number, patch: Partial<{ custom_value: string; emoji: string | null }>) => {
    await updateLastTimeCustom(supabase, id, patch);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        📌 Custom {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          {items.map(item => (
            <ItemRow key={item.id} label={`${item.emoji ?? ''} ${item.custom_value}`.trim()} onDelete={() => remove(item.id)}>
              <input type="text" className="input--short" defaultValue={item.emoji ?? ''}
                placeholder="Emoji"
                onBlur={e => update(item.id, { emoji: e.target.value || null })} />
              <input type="text" className="input--flex" defaultValue={item.custom_value}
                placeholder="Activity name…"
                onBlur={e => { if (e.target.value.trim()) update(item.id, { custom_value: e.target.value.trim() }); }} />
            </ItemRow>
          ))}
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
