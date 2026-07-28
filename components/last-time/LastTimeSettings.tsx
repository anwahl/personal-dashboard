'use client';

import { useRouter } from 'next/navigation';

/**
 * LastTimeSettings — manage last_time_media, last_time_boolean, last_time_custom.
 * Each section lazy-loads its items on first expand.
 */

import { useState, useCallback } from 'react';
import {
  getLastTimeMedia,    createLastTimeMedia,    updateLastTimeMedia,    deleteLastTimeMedia,
  getLastTimeBoolean,  createLastTimeBoolean,                          deleteLastTimeBoolean,
  getLastTimeCustom,   createLastTimeCustom,   updateLastTimeCustom,   deleteLastTimeCustom,
} from '@/lib/dal/last-time';
import { createClient }   from '@/lib/supabase/client';
import { Button }         from '@/components/ui/Button';
import { IconDisplay }    from '@/components/ui/IconDisplay';
import { IconPicker }     from '@/components/ui/IconPicker';
import { setIconId }      from '@/lib/dal/icons';
import { ConfirmButton }  from '@/components/ui/ConfirmButton';
import type {
  DailyTrackableRow,
  MediaTypeRow,
  MediaGenreRow,
  MediaStatusRow,
  LastTimeMediaRow,
  LastTimeBooleanRow,
  LastTimeCustomRow,
  IconRow,
} from '@/types/schema';

interface Props {
  trackables:    DailyTrackableRow[];
  mediaTypes:    MediaTypeRow[];
  mediaGenres:   MediaGenreRow[];
  mediaStatuses: MediaStatusRow[];
  icons:         IconRow[];
}

// ── Generic inline-edit row ───────────────────────────────────────────────────

interface EditRowProps {
  label:      string;
  subtitle?:  string;
  icon?:      import('@/types/schema').IconRow | null;
  onDelete:   () => void;
  children:   React.ReactNode;
}

function ItemRow({
  label, subtitle, icon, onDelete,
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
            {icon !== undefined && <IconDisplay icon={icon} size="sm" className="trackable-emoji" />}
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

function MediaSection({ mediaTypes, mediaGenres, mediaStatuses, icons }: Readonly<Pick<Props, 'mediaTypes' | 'mediaGenres' | 'mediaStatuses'> & { icons: IconRow[] }>) {
  const supabase = createClient();
  const router   = useRouter();
  const [items,    setItems]    = useState<LastTimeMediaRow[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [open,     setOpen]     = useState(false);
  const [label,    setLabel]    = useState('');
  const [iconId,   setIconId_m]   = useState<number | null>(null);
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
        icon_id:    iconId,
        type_id:    typeId   ? Number.parseInt(typeId)   : null,
        genre_id:   genreId  ? Number.parseInt(genreId)  : null,
        status_id:  statusId ? Number.parseInt(statusId) : null,
        sort_order: items.length,
      };
      const data = await createLastTimeMedia(supabase, payload);
      setItems(prev => [...prev, data]);
      setLabel(''); setIconId_m(null); setTypeId(''); setGenreId(''); setStatusId('');
      router.refresh();
    } finally { setSaving(false); }
  };

  const remove_m = async (id: number) => {
    await deleteLastTimeMedia(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
    router.refresh();
  };

  const update = async (id: number, patch: Partial<{ label: string }>) => {
    await updateLastTimeMedia(supabase, id, patch);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };
  const updateIcon_m = async (id: number, icon_id: number | null) => {
    await setIconId(supabase, 'last_time_media', id, icon_id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, icon_id } : i));
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
            <ItemRow key={item.id} label={item.label} subtitle={subtitle(item)} icon={icons.find(i => i.id === item.icon_id) ?? null} onDelete={() => remove_m(item.id)}>
              <IconPicker icons={icons} value={item.icon_id} onChange={id => updateIcon_m(item.id, id)} fallbackEmoji={item.emoji} size="sm" />
              <input type="text" className="input--flex" defaultValue={item.label}
                placeholder="Label…"
                onBlur={e => { if (e.target.value.trim()) update(item.id, { label: e.target.value.trim() }); }} />
            </ItemRow>
          ))}

          <div className="last-time-media-form">
            <div className="last-time-media-form__row">
              <IconPicker icons={icons} value={iconId} onChange={setIconId_m} size="sm" />
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

function BooleanSection({ trackables, icons }: Readonly<Pick<Props, 'trackables'> & { icons: IconRow[] }>) {
  const supabase = createClient();
  const router   = useRouter();
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
      router.refresh();
    } finally { setSaving(false); }
  };

  const remove_b = async (id: number) => {
    await deleteLastTimeBoolean(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
    router.refresh();
  };

  const updateIcon_b = async (id: number, icon_id: number | null) => {
    await setIconId(supabase, 'last_time_boolean', id, icon_id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, icon_id } : i));
  };

  const label = (row: LastTimeBooleanRow) => {
    const t = trackables.find(t => t.id === row.trackable_id);
    return t?.name ?? `#${row.trackable_id}`;
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        ✅ Habits {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          {items.map(item => (
            <ItemRow key={item.id} label={label(item)} icon={icons.find(i => i.id === item.icon_id) ?? null} onDelete={() => remove_b(item.id)}>
              <IconPicker icons={icons} value={item.icon_id} onChange={id => updateIcon_b(item.id, id)} fallbackEmoji={item.emoji} size="sm" />
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
                .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button variant="accent" size="sm" onClick={add} disabled={!trackId || saving}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Custom section ────────────────────────────────────────────────────────────

function CustomSection({ icons }: Readonly<{ icons: IconRow[] }>) {
  const supabase = createClient();
  const router   = useRouter();
  const [items,  setItems]  = useState<LastTimeCustomRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open,   setOpen]   = useState(false);
  const [value,  setValue]  = useState('');
  const [iconId, setIconId_c] = useState<number | null>(null);
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
        icon_id: iconId,
        sort_order: items.length,
      });
      setItems(prev => [...prev, data]);
      setValue(''); setIconId_c(null);
      router.refresh();
    } finally { setSaving(false); }
  };

  const remove_c = async (id: number) => {
    await deleteLastTimeCustom(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
    router.refresh();
  };

  const update = async (id: number, patch: Partial<{ custom_value: string }>) => {
    await updateLastTimeCustom(supabase, id, patch);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };
  const updateIcon_c = async (id: number, icon_id: number | null) => {
    await setIconId(supabase, 'last_time_custom', id, icon_id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, icon_id } : i));
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        📌 Custom {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          {items.map(item => (
            <ItemRow key={item.id} label={item.custom_value} icon={icons.find(i => i.id === item.icon_id) ?? null} onDelete={() => remove_c(item.id)}>
              <IconPicker icons={icons} value={item.icon_id} onChange={id => updateIcon_c(item.id, id)} fallbackEmoji={item.emoji} size="sm" />
              <input type="text" className="input--flex" defaultValue={item.custom_value}
                placeholder="Activity name…"
                onBlur={e => { if (e.target.value.trim()) update(item.id, { custom_value: e.target.value.trim() }); }} />
            </ItemRow>
          ))}
          <div className="manage-add-row">
            <IconPicker icons={icons} value={iconId} onChange={setIconId_c} size="sm" />
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

export function LastTimeSettings({ trackables, mediaTypes, mediaGenres, mediaStatuses, icons }: Readonly<Props>) {
  return (
    <div>
      <MediaSection mediaTypes={mediaTypes} mediaGenres={mediaGenres} mediaStatuses={mediaStatuses} icons={icons} />
      <BooleanSection trackables={trackables} icons={icons} />
      <CustomSection icons={icons} />
    </div>
  );
}
