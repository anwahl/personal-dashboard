/**
 * components/settings/IconSettings.tsx
 *
 * Settings section for managing the icons library.
 *
 * - Lists all icons with SVG preview, editable name + tags, sort ↑/↓, delete
 * - Add form: name, tags, svg_data textarea with live preview
 * - Mutations go through lib/dal/icons.ts
 */

'use client';

import { useState }                  from 'react';
import { useRouter }                  from 'next/navigation';
import { createClient }               from '@/lib/supabase/client';
import type { IconRow }               from '@/types/schema';
import { createIcon, updateIcon, deleteIcon } from '@/lib/dal/icons';
import { batchSetSortOrder }          from '@/lib/dal/settings';
import { normalizedReorderUpdates }   from '@/lib/utils/sort';
import { Button, ConfirmButton, IconDisplay }                     from '@/components/ui';

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

  // ── Add form state ──────────────────────────────────────────────────────────
  const [addName,    setAddName]    = useState('');
  const [addTags,    setAddTags]    = useState('');
  const [addSvg,     setAddSvg]     = useState('');
  const [addError,   setAddError]   = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const svgPreview = cleanSvg(addSvg);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        sort_order: items.length,
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

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    await deleteIcon(supabase, id);
    setItems(prev => prev.filter(i => i.id !== id));
    router.refresh();
  };

  // ── Sort ────────────────────────────────────────────────────────────────────
  const move = async (idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const updates = normalizedReorderUpdates(items, idx, swapIdx);
    // Apply optimistic update
    const reordered = [...items];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setItems(reordered);
    await batchSetSortOrder(supabase, 'icons', updates);
    router.refresh();
  };

  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Icons</h2>
      </div>
      <p className="settings-section__desc">
        SVG icons used throughout the app. Paste raw SVG markup below to add one.
        Tags are space-separated keywords used for searching.
      </p>

      {/* ── Icon list ──────────────────────────────────────────────────────── */}
      {items.length === 0 && (
        <p className="manage-item__meta">No icons yet — add one below.</p>
      )}

      {items.map((icon, idx) => (
        <IconSettingsRow
          key={icon.id}
          icon={icon}
          idx={idx}
          total={items.length}
          onSave={save}
          onDelete={handleDelete}
          onMove={move}
        />
      ))}

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
            <input
              type="text"
              className="input"
              placeholder="Icon name (e.g. Bell)"
              value={addName}
              onChange={e => setAddName(e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Tags — space-separated (e.g. alert reminder notification)"
              value={addTags}
              onChange={e => setAddTags(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            📁 Upload .svg file
            <input type="file" accept=".svg,image/svg+xml" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>or paste below</span>
        </div>
        <textarea
          className="input textarea--tall"
          placeholder="Paste SVG markup here…"
          value={addSvg}
          onChange={e => setAddSvg(e.target.value)}
          spellCheck={false}
        />

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
    </section>
  );
}

// ── Row sub-component ─────────────────────────────────────────────────────────

interface RowProps {
  icon:     IconRow;
  idx:      number;
  total:    number;
  onSave:   (id: number, patch: Partial<Pick<IconRow, 'name' | 'tags' | 'is_active'>>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMove:   (idx: number, dir: -1 | 1) => Promise<void>;
}

function IconSettingsRow({ icon, idx, total, onSave, onDelete, onMove }: Readonly<RowProps>) {
  return (
    <div className={`icon-settings-item${icon.is_active ? '' : ' icon-settings-item--inactive'}`}>
      {/* Preview */}
      <div className="icon-settings-item__preview">
        <IconDisplay icon={icon} size="lg" />
      </div>

      {/* Editable name + tags */}
      <div className="icon-settings-item__fields">
        <input
          type="text"
          className="input icon-settings-item__name"
          defaultValue={icon.name}
          onBlur={e => {
            const v = e.target.value.trim();
            if (v && v !== icon.name) onSave(icon.id, { name: v });
          }}
        />
        <input
          type="text"
          className="input icon-settings-item__tags"
          defaultValue={icon.tags ?? ''}
          placeholder="tags (space-separated)"
          onBlur={e => {
            const v = e.target.value.trim() || null;
            if (v !== icon.tags) onSave(icon.id, { tags: v });
          }}
        />
      </div>

      {/* Sort buttons */}
      <div className="icon-settings-item__sort">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMove(idx, -1)}
          disabled={idx === 0}
          title="Move up"
        >↑</button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMove(idx, 1)}
          disabled={idx === total - 1}
          title="Move down"
        >↓</button>
      </div>

      {/* Actions */}
      <div className="icon-settings-item__actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSave(icon.id, { is_active: !icon.is_active })}
          title={icon.is_active ? 'Deactivate' : 'Activate'}
        >
          {icon.is_active ? '●' : '○'}
        </Button>
        <ConfirmButton onConfirm={() => onDelete(icon.id)} size="sm" />
      </div>
    </div>
  );
}
