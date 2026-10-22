'use client';

/**
 * LastTimeSettings — one sortable list of every Last Time item.
 *
 * Media, Metric and Custom items live in three tables but show as one list,
 * in the same order as the Last Time page (which merges them by sort_order).
 * Each row has a kind badge; the add row starts with a kind picker and then
 * shows that kind's fields. Items are deactivated, never deleted.
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter }    from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createLastTimeMedia, createLastTimeBoolean, createLastTimeCustom } from '@/lib/dal/lasttime';
import { toggleSettingsItem, updateSettingsItem, batchSetSortOrder } from '@/lib/dal/settings';
import type { ManageableTable } from '@/lib/dal/settings';
import { useLastTimeSettingsItems } from '@/lib/hooks/reference';
import {
  Button, DragHandle, IconDisplay, ManageItem, RowMenu, SortableItem, SortableList, EmptyState, Badge, SectionCard, InactiveGroup
} from '@/components/ui';
import type { SortMove } from '@/components/ui';
import { TrackablePicker } from '@/components/settings/TrackablePicker';
import {
  FieldInputs, buildPayload, emptyValues, valuesFrom, visibleFields,
  type AddField, type FieldValues, type IconValues,
} from '@/components/settings/FieldInputs';
import type { LastTimeCategory, LastTimeSettingsItems } from '@/types/dal';
import type {
  DailyTrackableRow, MediaTypeRow, MediaGenreRow, MediaStatusRow, IconRow,
} from '@/types/schema';

interface Props {
  trackables:    DailyTrackableRow[];
  mediaTypes:    MediaTypeRow[];
  mediaGenres:   MediaGenreRow[];
  mediaStatuses: MediaStatusRow[];
  icons:         IconRow[];
}

type Kind = LastTimeCategory;   // 'media' | 'boolean' | 'custom'

const TABLE: Record<Kind, ManageableTable> = {
  media:   'last_time_media',
  boolean: 'last_time_boolean',
  custom:  'last_time_custom',
};
const KIND_LABEL: Record<Kind, string> = { media: 'Media', boolean: 'Metric', custom: 'Custom' };
/** Tie-break for equal sort_orders — the order the Last Time page merges them in. */
const KIND_ORDER: Kind[] = ['media', 'boolean', 'custom'];

/** One row of the combined list, whatever table it came from. */
interface Item {
  key:        string;
  kind:       Kind;
  id:         number;
  name:       string;
  icon_id:    number | null;
  sort_order: number;
  is_active:  boolean;
  /** Media filters, e.g. "Game · Horror · Finished". */
  detail?:    string;
  /** Field values for editing (see fieldsFor). */
  values:     Record<string, unknown>;
}

const sameItem = (a: Item, b: Item) => a.kind === b.kind && a.id === b.id;

export function LastTimeSettings({ trackables, mediaTypes, mediaGenres, mediaStatuses, icons }: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();
  const { data, mutate } = useLastTimeSettingsItems();

  const [newVals,  setNewVals]  = useState<FieldValues>({});
  const [newIcons, setNewIcons] = useState<IconValues>({});
  const [trackId,  setTrackId]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [edit,     setEdit]     = useState<{ key: string; values: FieldValues; iconValues: IconValues } | null>(null);

  // ── Fields ─────────────────────────────────────────────────────────────────

  const fields = useMemo<AddField[]>(() => {
    const isMedia = (v: Record<string, string>) => v.kind === 'media';
    return [
      {
        key: 'kind', type: 'select', label: 'Kind', defaultValue: 'custom', showInEdit: false,
        options: KIND_ORDER.map(k => ({ value: k, label: KIND_LABEL[k] })),
      },
      { key: 'icon_id', type: 'icon', label: 'Icon' },
      {
        key: 'name', type: 'text', label: 'Name', required: true,
        placeholder: 'Name… e.g. Last horror game finished',
        showWhen: v => v.kind !== 'boolean',   // a metric uses its metric's name
      },
      { key: 'type_id',   type: 'select', label: 'Type',   parseAs: 'int', required: false, placeholder: 'Any type',   showWhen: isMedia,
        options: mediaTypes.map(t => ({ value: String(t.id), label: t.type_name })) },
      { key: 'genre_id',  type: 'select', label: 'Genre',  parseAs: 'int', required: false, placeholder: 'Any genre',  showWhen: isMedia,
        options: mediaGenres.map(g => ({ value: String(g.id), label: g.genre_name })) },
      { key: 'status_id', type: 'select', label: 'Status', parseAs: 'int', required: false, placeholder: 'Any status', showWhen: isMedia,
        options: mediaStatuses.map(s => ({ value: String(s.id), label: s.status_name })) },
    ];
  }, [mediaTypes, mediaGenres, mediaStatuses]);

  const add = { ...emptyValues(fields).values, ...newVals };
  const addIcons = { ...emptyValues(fields).iconValues, ...newIcons };

  // ── Combined list ──────────────────────────────────────────────────────────

  const items = useMemo<Item[]>(() => {
    if (!data) return [];
    const typeMap   = new Map(mediaTypes.map(t => [t.id, t.type_name]));
    const genreMap  = new Map(mediaGenres.map(g => [g.id, g.genre_name]));
    const statusMap = new Map(mediaStatuses.map(s => [s.id, s.status_name]));
    const base = (kind: Kind, row: { id: number; icon_id: number | null; sort_order?: number; is_active: boolean }) => ({
      key: `${kind}:${row.id}`, kind, id: row.id, icon_id: row.icon_id,
      sort_order: row.sort_order ?? 0, is_active: row.is_active,
    });
    return [
      ...data.media.map(r => ({
        ...base('media', r),
        name:   r.label,
        detail: [r.type_id && typeMap.get(r.type_id), r.genre_id && genreMap.get(r.genre_id), r.status_id && statusMap.get(r.status_id)]
                  .filter(Boolean).join(' · '),
        values: { kind: 'media', icon_id: r.icon_id, name: r.label, type_id: r.type_id, genre_id: r.genre_id, status_id: r.status_id },
      })),
      ...data.boolean.map(r => {
        const t = trackables.find(t => t.id === r.trackable_id);
        return {
          ...base('boolean', r),
          icon_id: r.icon_id ?? t?.icon_id ?? null,
          name:    t?.name ?? `#${r.trackable_id}`,
          values:  { kind: 'boolean', icon_id: r.icon_id },
        };
      }),
      ...data.custom.map(r => ({
        ...base('custom', r),
        name:   r.custom_value,
        values: { kind: 'custom', icon_id: r.icon_id, name: r.custom_value },
      })),
    ];
  }, [data, trackables, mediaTypes, mediaGenres, mediaStatuses]);

  const byOrder = (a: Item, b: Item) =>
    a.sort_order - b.sort_order || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.id - b.id;
  const active   = items.filter(i =>  i.is_active).sort(byOrder);
  const inactive = items.filter(i => !i.is_active).sort(byOrder);

  const linkedTrackables = new Set(data?.boolean.map(r => r.trackable_id) ?? []);

  // ── Cache updates ──────────────────────────────────────────────────────────

  /** Applies a change to one item's row in the SWR cache (no refetch). */
  const patchRow = useCallback((kind: Kind, id: number, patch: Record<string, unknown>) =>
    mutate(d => d && ({
      ...d,
      [kind]: (d[kind] as { id: number }[]).map(r => r.id === id ? { ...r, ...patch } : r),
    } as LastTimeSettingsItems), { revalidate: false }), [mutate]);

  /** After a change: refresh server data (the Last Time page's list). */
  const done = useCallback(() => router.refresh(), [router]);

  // ── Add ────────────────────────────────────────────────────────────────────

  const kind = add.kind as Kind;
  const hasFilter = !!(add.type_id || add.genre_id || add.status_id);
  const canAdd =
    kind === 'boolean' ? !!trackId :
    kind === 'media'   ? !!add.name.trim() && hasFilter :
                         !!add.name.trim();

  const addItem = async () => {
    if (!canAdd || saving || !data) return;
    setSaving(true);
    try {
      const v = buildPayload(visibleFields(fields, 'add', add), add, addIcons);
      const sort_order = active.length;
      const icon_id = (v.icon_id as number | null) ?? null;
      if (kind === 'media') {
        const row = await createLastTimeMedia(supabase, {
          label: String(v.name), icon_id, sort_order,
          type_id:   (v.type_id   as number | null) ?? null,
          genre_id:  (v.genre_id  as number | null) ?? null,
          status_id: (v.status_id as number | null) ?? null,
        });
        await mutate({ ...data, media: [...data.media, row] }, { revalidate: false });
      } else if (kind === 'boolean') {
        const row = await createLastTimeBoolean(supabase, { trackable_id: Number(trackId), icon_id, sort_order });
        await mutate({ ...data, boolean: [...data.boolean, row] }, { revalidate: false });
      } else {
        const row = await createLastTimeCustom(supabase, { custom_value: String(v.name), icon_id, sort_order });
        await mutate({ ...data, custom: [...data.custom, row] }, { revalidate: false });
      }
      setNewVals({ kind });   // keep the chosen kind for the next add
      setNewIcons({});
      setTrackId('');
      done();
    } finally { setSaving(false); }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────

  const startEdit = (item: Item) => {
    const { values, iconValues } = valuesFrom(fields, item.values);
    setEdit({ key: item.key, values, iconValues });
  };

  const saveEdit = async (item: Item) => {
    if (!edit) return;
    const v = buildPayload(visibleFields(fields, 'edit', edit.values), edit.values, edit.iconValues);
    if (item.kind !== 'boolean' && !v.name) return;
    if (item.kind === 'media' && !(v.type_id || v.genre_id || v.status_id)) return;

    const { name, ...rest } = v;
    const patch =
      item.kind === 'media'  ? { ...rest, label: name } :
      item.kind === 'custom' ? { icon_id: rest.icon_id, custom_value: name } :
                               { icon_id: rest.icon_id };
    await updateSettingsItem(supabase, TABLE[item.kind], item.id, patch);
    await patchRow(item.kind, item.id, patch);
    setEdit(null);
    done();
  };

  // ── Activate / deactivate ──────────────────────────────────────────────────

  const toggleActive = async (item: Item) => {
    await toggleSettingsItem(supabase, TABLE[item.kind], item.id, !item.is_active);
    await patchRow(item.kind, item.id, { is_active: !item.is_active });
    done();
  };

  // ── Reorder (one order across all three tables) ────────────────────────────

  const handleMove = async ({ fromIndex, toIndex }: SortMove) => {
    if (!data) return;
    const reordered = [...active];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updates: Record<Kind, { id: number; sort_order: number }[]> = { media: [], boolean: [], custom: [] };
    reordered.forEach((item, i) => updates[item.kind].push({ id: item.id, sort_order: i }));

    const order = (kind: Kind) => new Map(updates[kind].map(u => [u.id, u.sort_order]));
    const apply = <T extends { id: number; sort_order?: number }>(rows: T[], m: Map<number, number>) =>
      rows.map(r => m.has(r.id) ? { ...r, sort_order: m.get(r.id)! } : r);
    await mutate({
      media:   apply(data.media,   order('media')),
      boolean: apply(data.boolean, order('boolean')),
      custom:  apply(data.custom,  order('custom')),
    }, { revalidate: false });

    await Promise.all(KIND_ORDER
      .filter(k => updates[k].length > 0)
      .map(k => batchSetSortOrder(supabase, TABLE[k], updates[k])));
    done();
  };

  // ── Row ────────────────────────────────────────────────────────────────────

  const renderRow = (item: Item, sortable?: { ref: (el: Element | null) => void; handleRef: (el: Element | null) => void; isDragging: boolean }) => (
    <ManageItem
      ref={sortable?.ref}
      dragging={sortable?.isDragging}
      inactive={!item.is_active}
      handle={sortable && <DragHandle ref={sortable.handleRef} label={`Drag to reorder ${item.name}`} />}
      menu={
        <RowMenu
          label={item.name}
          items={[
            { label: 'Edit', onSelect: () => startEdit(item) },
            { label: item.is_active ? 'Deactivate' : 'Activate', onSelect: () => toggleActive(item) },
          ]}
        />
      }
      editing={edit?.key === item.key ? (
        <>
          {item.kind === 'boolean' && <span className="manage-item__name">{item.name}</span>}
          <FieldInputs
            fields={fields}
            mode="edit"
            values={edit.values}
            iconValues={edit.iconValues}
            onChange={(key, value) => setEdit(prev => prev && ({ ...prev, values: { ...prev.values, [key]: value } }))}
            onIconChange={(key, id) => setEdit(prev => prev && ({ ...prev, iconValues: { ...prev.iconValues, [key]: id } }))}
            onEnter={() => saveEdit(item)}
            onEscape={() => setEdit(null)}
            icons={icons}
            autoFocusKey="name"
          />
          <Button size="sm" variant="accent" onClick={() => saveEdit(item)} aria-label="Save">✓</Button>
          <Button size="sm" variant="ghost"  onClick={() => setEdit(null)} aria-label="Cancel">✕</Button>
        </>
      ) : undefined}
    >
      <IconDisplay icon={icons.find(i => i.id === item.icon_id) ?? null} size="sm" className="trackable-emoji" />
      {item.name}
      <Badge>{KIND_LABEL[item.kind]}</Badge>
      {item.detail && <span className="manage-item__meta manage-item__meta--truncate">{item.detail}</span>}
    </ManageItem>
  );

  return (
    <SectionCard
      title="Last Time Items"
      meta={`${active.length} active`}
      description="Media items match any combination of type, genre and status. Metric items use the last day a Yes/No metric was checked."
    >

      <div className="manage-list">
        {!data && <EmptyState>Loading…</EmptyState>}
        {data && active.length === 0 && <EmptyState>None active.</EmptyState>}
        <SortableList onMove={handleMove}>
          {active.map((item, idx) => (
            <SortableItem key={item.key} id={`lt:${item.key}`} index={idx}>
              {sortable => renderRow(item, sortable)}
            </SortableItem>
          ))}
        </SortableList>
      </div>

      <InactiveGroup count={inactive.length}>
        {inactive.map(item => <div key={item.key}>{renderRow(item)}</div>)}
      </InactiveGroup>

      <div className="manage-add-row">
        <FieldInputs
          fields={fields}
          mode="add"
          values={add}
          iconValues={addIcons}
          onChange={(key, value) => setNewVals(prev => ({ ...prev, [key]: value }))}
          onIconChange={(key, id) => setNewIcons(prev => ({ ...prev, [key]: id }))}
          onEnter={addItem}
          icons={icons}
        />
        {kind === 'boolean' && (
          <TrackablePicker
            trackables={trackables.filter(t => !linkedTrackables.has(t.id))}
            icons={icons}
            value={trackId}
            onChange={setTrackId}
            placeholder="Select metric…"
          />
        )}
        <Button variant="accent" size="sm" onClick={addItem} disabled={!canAdd || saving}>
          {saving ? '…' : '+ Add'}
        </Button>
        {kind === 'media' && add.name.trim() && !hasFilter && (
          <p className="manage-add-row__hint">Pick at least one of type, genre or status.</p>
        )}
      </div>
    </SectionCard>
  );
}
