/**
 * components/settings/IconSettings.tsx
 *
 * Settings section for managing the icons library.
 *
 * - Lists icons as ManageItem rows: preview, name, tags; drag to reorder;
 *   ⋯ menu for edit (name + tags) and activate/deactivate
 * - Add form: name, tags, svg_data textarea with live preview
 * - Mutations go through lib/dal/icons.ts
 */

'use client';

import { useState, type ChangeEvent } from 'react';
import { useRouter }                  from 'next/navigation';
import { createClient }               from '@/lib/supabase/client';
import type { IconRow }               from '@/types/schema';
import { createIcon, updateIcon } from '@/lib/dal/icons';
import { batchSetSortOrder }          from '@/lib/dal/settings';
import { bySortOrder, reorderUpdates } from '@/lib/utils/sort';
import {
  Button, DragHandle, IconDisplay, ManageItem, RowMenu, SortableItem, SortableList, SectionCard, InactiveGroup, EmptyState, TextField, TextAreaField
} from '@/components/ui';
import type { SortMove } from '@/components/ui';
import { FieldInputs, type AddField, type FieldValues } from './FieldInputs';

interface Props {
  icons: IconRow[];
}

/** Strip XML declaration and DOCTYPE — not needed for inline SVG. */
function cleanSvg(raw: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .trim();
}

export function IconSettings({ icons: initialIcons }: Readonly<Props>) {
  const router   = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<IconRow[]>(initialIcons);
  const active   = items.filter(i =>  i.is_active).sort(bySortOrder);
  const inactive = items.filter(i => !i.is_active).sort(bySortOrder);

  // ── Add form state ──────────────────────────────────────────────────────────
  const [addName,    setAddName]    = useState('');
  const [addTags,    setAddTags]    = useState('');
  const [addSvg,     setAddSvg]     = useState('');
  const [addError,   setAddError]   = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const svgPreview = cleanSvg(addSvg);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setAddSvg((ev.target?.result as string) ?? ''); };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-uploaded
  };
  const svgValid   = svgPreview.startsWith('<svg');

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const name = addName.trim();
    if (!name)     { setAddError('Name is required.'); return; }
    if (!svgValid) { setAddError('SVG data must start with <svg>.'); return; }

    setAddError('');
    setAddLoading(true);
    try {
      const newIcon = await createIcon(supabase, {
        name,
        tags:       addTags.trim() || null,
        svg_data:   svgPreview,
        sort_order: active.length,
      });
      setItems(prev => [...prev, newIcon]);
      setAddName('');
      setAddTags('');
      setAddSvg('');
      router.refresh();
    } catch (e) {
      setAddError(String(e));
    } finally {
      setAddLoading(false);
    }
  };

  // ── Inline edit ─────────────────────────────────────────────────────────────
  const save = async (id: number, patch: Partial<Pick<IconRow, 'name' | 'tags' | 'is_active'>>) => {
    await updateIcon(supabase, id, patch);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    router.refresh();
  };

  // ── Reorder (drag and drop) ─────────────────────────────────────────────────
  const handleMove = async ({ fromIndex, toIndex }: SortMove) => {
    const updates   = reorderUpdates(active, fromIndex, toIndex);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setItems(prev => prev.map(i => updateMap.has(i.id) ? { ...i, sort_order: updateMap.get(i.id)! } : i));
    await batchSetSortOrder(supabase, 'icons', updates);
    router.refresh();
  };

  return (
    <SectionCard
      title="Icons"
      meta={`${active.length} active`}
      description="SVG icons used throughout the app. Paste raw SVG markup below to add one. Tags are space-separated keywords used for searching."
    >

      {/* ── Icon list ──────────────────────────────────────────────────────── */}
      {items.length === 0 && <EmptyState>No icons yet — add one below.</EmptyState>}

      <div className="manage-list">
        <SortableList onMove={handleMove}>
          {active.map((icon, idx) => (
            <SortableItem key={icon.id} id={`icon:${icon.id}`} index={idx}>
              {sortable => <IconSettingsRow icon={icon} sortable={sortable} onSave={save} />}
            </SortableItem>
          ))}
        </SortableList>
      </div>

      <InactiveGroup count={inactive.length}>
        {inactive.map(icon => (
          <IconSettingsRow key={icon.id} icon={icon} onSave={save} />
        ))}
      </InactiveGroup>

      {/* ── Add form ────────────────────────────────────────────────────────── */}
      <div className="icon-add-form">
        <div className="icon-add-form__row">
          {/* Live SVG preview */}
          <div className="icon-add-form__preview">
            {svgValid
              ? (
                <span
                  className="icon-add-form__svg-preview"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: svgPreview }}
                  aria-hidden="true"
                />
              )
              : <span className="icon-add-form__placeholder">?</span>
            }
          </div>

          <div className="icon-add-form__fields">
            <TextField hideLabel label="Icon name" placeholder="Icon name (e.g. Bell)"
              value={addName} onChange={setAddName} />
            <TextField hideLabel label="Tags" placeholder="Tags — space-separated (e.g. alert reminder notification)"
              value={addTags} onChange={setAddTags} />
          </div>
        </div>

        <div className="icon-add-form__upload-row">
          <label className="icon-add-form__upload">
            📁 Upload .svg file
            <input type="file" accept=".svg,image/svg+xml" onChange={handleFileUpload} hidden />
          </label>
          <span className="icon-add-form__hint">or paste below</span>
        </div>
        <TextAreaField hideLabel label="SVG markup" size="tall" placeholder="Paste SVG markup here…"
          value={addSvg} onChange={setAddSvg} spellCheck={false} />

        {addError && <p className="form-error">{addError}</p>}

        <Button
          variant="accent"
          size="sm"
          onClick={handleAdd}
          disabled={addLoading}
        >
          {addLoading ? 'Adding…' : '+ Add Icon'}
        </Button>
      </div>
    </SectionCard>
  );
}

// ── Row sub-component ─────────────────────────────────────────────────────────

type IconPatch = Partial<Pick<IconRow, 'name' | 'tags' | 'is_active'>>;

const EDIT_FIELDS: AddField[] = [
  { key: 'name', type: 'text', label: 'Name', required: true },
  { key: 'tags', type: 'text', label: 'Tags', placeholder: 'tags (space-separated)', required: false },
];

interface RowProps {
  icon:      IconRow;
  sortable?: { ref: (el: Element | null) => void; handleRef: (el: Element | null) => void; isDragging: boolean };
  onSave:    (id: number, patch: IconPatch) => Promise<void>;
}

function IconSettingsRow({ icon, sortable, onSave }: Readonly<RowProps>) {
  const [editVals, setEditVals] = useState<FieldValues | null>(null);

  const saveEdit = async () => {
    if (!editVals) return;
    const name = editVals.name.trim();
    if (!name) return;
    await onSave(icon.id, { name, tags: editVals.tags.trim() || null });
    setEditVals(null);
  };

  return (
    <ManageItem
      ref={sortable?.ref}
      dragging={sortable?.isDragging}
      inactive={!icon.is_active}
      handle={sortable && <DragHandle ref={sortable.handleRef} label={`Drag to reorder ${icon.name}`} />}
      menu={
        <RowMenu
          label={icon.name}
          items={[
            { label: 'Edit', onSelect: () => setEditVals({ name: icon.name, tags: icon.tags ?? '' }) },
            { label: icon.is_active ? 'Deactivate' : 'Activate', onSelect: () => onSave(icon.id, { is_active: !icon.is_active }) },
          ]}
        />
      }
      editing={editVals ? (
        <>
          <IconDisplay icon={icon} size="lg" />
          <FieldInputs
            fields={EDIT_FIELDS}
            mode="edit"
            values={editVals}
            iconValues={{}}
            onChange={(key, value) => setEditVals(prev => prev && ({ ...prev, [key]: value }))}
            onIconChange={() => {}}
            onEnter={saveEdit}
            onEscape={() => setEditVals(null)}
            autoFocusKey="name"
          />
          <Button size="sm" variant="accent" onClick={saveEdit} aria-label="Save">✓</Button>
          <Button size="sm" variant="ghost"  onClick={() => setEditVals(null)} aria-label="Cancel">✕</Button>
        </>
      ) : undefined}
    >
      <IconDisplay icon={icon} size="lg" className="trackable-emoji" />
      {icon.name}
      {icon.tags && <span className="manage-item__meta manage-item__meta--truncate">{icon.tags}</span>}
    </ManageItem>
  );
}
