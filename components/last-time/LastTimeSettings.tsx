'use client';

/**
 * LastTimeSettings — manage last_time_media, last_time_boolean, last_time_custom.
 * Three collapsible sections, one per table.
 */

import { useState, useCallback } from 'react';
import { createClient }           from '@/lib/supabase/client';
import { Button }                 from '@/components/ui/Button';
import type { LastTimeMediaFlag } from '@/types/schema';

interface Props {
  trackables:    any[];
  mediaTypes:    any[];
  mediaGenres:   any[];
  mediaStatuses: any[];
}

// ── Generic item list ─────────────────────────────────────────────────────────

function ItemRow({ item, onDelete }: { item: any; onDelete: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="manage-item">
      <span className="manage-item__name">
        {item.emoji ?? ''} {item.label ?? item.custom_value ?? `#${item.id}`}
      </span>
      {item.subtitle && <span className="badge">{item.subtitle}</span>}
      <Button variant="ghost" size="icon"
        onClick={() => { if (confirming) onDelete(item.id); else setConfirming(true); }}
        title={confirming ? 'Click again to confirm' : 'Remove'}>
        {confirming ? '?' : '✕'}
      </Button>
    </div>
  );
}

// ── Media section ─────────────────────────────────────────────────────────────

function MediaSection({ mediaTypes, mediaGenres, mediaStatuses }: Pick<Props, 'mediaTypes' | 'mediaGenres' | 'mediaStatuses'>) {
  const supabase = createClient();
  const [items,      setItems]      = useState<any[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [open,       setOpen]       = useState(false);
  const [flag,       setFlag]       = useState<LastTimeMediaFlag>('type');
  const [flagValue,  setFlagValue]  = useState('');
  const [emoji,      setEmoji]      = useState('');
  const [label,      setLabel]      = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('last_time_media').select('*').order('sort_order');
    const options = flag === 'type' ? mediaTypes : flag === 'genre' ? mediaGenres : mediaStatuses;
    setItems((data ?? []).map((row: any) => {
      const opt = options.find((o: any) => o.id === row.flag_value);
      const name = opt?.type_name ?? opt?.genre_name ?? opt?.status_name ?? '';
      return { ...row, label: row.label ?? name, subtitle: `${row.last_time_flag}: ${name}` };
    }));
    setLoaded(true);
  }, [supabase, flag, mediaTypes, mediaGenres, mediaStatuses]);

  const toggle = async () => {
    if (!open && !loaded) await load();
    setOpen(o => !o);
  };

  const flagOptions = flag === 'type' ? mediaTypes
    : flag === 'genre' ? mediaGenres : mediaStatuses;

  const flagValueName = (o: any) => o.type_name ?? o.genre_name ?? o.status_name ?? '';

  const add = async () => {
    if (!flagValue || saving) return;
    setSaving(true);
    try {
      const { data } = await supabase.from('last_time_media')
        .insert({ last_time_flag: flag, flag_value: parseInt(flagValue), emoji: emoji || null, label: label || null, sort_order: items.length })
        .select().single();
      if (data) {
        const opt = flagOptions.find((o: any) => o.id === parseInt(flagValue));
        setItems(prev => [...prev, { ...data, label: label || flagValueName(opt) || data.id, subtitle: `${flag}: ${flagValueName(opt)}` }]);
      }
      setFlagValue(''); setEmoji(''); setLabel('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await supabase.from('last_time_media').delete().eq('id', id);
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
            Track "last time I watched / read / played / finished" based on media type, genre, or status.
          </p>
          {items.map(item => <ItemRow key={item.id} item={item} onDelete={remove} />)}
          <div className="manage-add-row">
            <select value={flag} onChange={e => { setFlag(e.target.value as LastTimeMediaFlag); setFlagValue(''); }} className="settings-select">
              <option value="type">By type</option>
              <option value="genre">By genre</option>
              <option value="status">By status</option>
            </select>
            <select value={flagValue} onChange={e => setFlagValue(e.target.value)} className="settings-select">
              <option value="">Select…</option>
              {flagOptions.map((o: any) => (
                <option key={o.id} value={o.id}>{flagValueName(o)}</option>
              ))}
            </select>
            <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
              placeholder="Emoji" style={{ width: 48 }} />
            <input type="text" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Custom label (optional)" style={{ flex: 1 }} />
            <Button variant="accent" size="sm" onClick={add} disabled={!flagValue || saving}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Boolean section ───────────────────────────────────────────────────────────

function BooleanSection({ trackables }: Pick<Props, 'trackables'>) {
  const supabase = createClient();
  const [items,     setItems]     = useState<any[]>([]);
  const [loaded,    setLoaded]    = useState(false);
  const [open,      setOpen]      = useState(false);
  const [trackId,   setTrackId]   = useState('');
  const [emoji,     setEmoji]     = useState('');
  const [saving,    setSaving]    = useState(false);

  const linkedIds = new Set(items.map((i: any) => i.trackable_id));

  const load = useCallback(async () => {
    const { data } = await supabase.from('last_time_boolean').select('*').order('sort_order');
    setItems((data ?? []).map((row: any) => {
      const t = trackables.find((t: any) => t.id === row.trackable_id);
      return { ...row, label: t ? `${t.emoji ?? ''} ${t.name}` : `#${row.trackable_id}` };
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
      const { data } = await supabase.from('last_time_boolean')
        .insert({ trackable_id: parseInt(trackId), emoji: emoji || null, sort_order: items.length })
        .select().single();
      if (data) {
        const t = trackables.find((t: any) => t.id === parseInt(trackId));
        setItems(prev => [...prev, { ...data, label: t ? `${t.emoji ?? ''} ${t.name}` : `#${data.id}` }]);
      }
      setTrackId(''); setEmoji('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await supabase.from('last_time_boolean').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="last-time-section">
      <button type="button" className="last-time-section__toggle" onClick={toggle}>
        ✅ Habits / Booleans {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="last-time-section__body">
          <p className="last-time-section__desc">
            Track "last time I did [habit]". Date comes from habit_entries automatically.
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
  const [items,   setItems]   = useState<any[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [open,    setOpen]    = useState(false);
  const [value,   setValue]   = useState('');
  const [emoji,   setEmoji]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('last_time_custom').select('*').order('sort_order');
    setItems((data ?? []).map((row: any) => ({ ...row, label: `${row.emoji ?? ''} ${row.custom_value}` })));
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
      const { data } = await supabase.from('last_time_custom')
        .insert({ custom_value: value.trim(), emoji: emoji || null, sort_order: items.length })
        .select().single();
      if (data) setItems(prev => [...prev, { ...data, label: `${data.emoji ?? ''} ${data.custom_value}` }]);
      setValue(''); setEmoji('');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await supabase.from('last_time_custom').delete().eq('id', id);
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

export function LastTimeSettings({ trackables, mediaTypes, mediaGenres, mediaStatuses }: Props) {
  return (
    <div>
      <h2 className="settings-section-heading">Manage Last Time Items</h2>
      <MediaSection mediaTypes={mediaTypes} mediaGenres={mediaGenres} mediaStatuses={mediaStatuses} />
      <BooleanSection trackables={trackables} />
      <CustomSection />
    </div>
  );
}
