'use client';

import { useState, useCallback } from 'react';
import {
  addSymptomCategory,    updateSymptomCategory, deleteSymptomCategory,
  addSymptomType,        updateSymptomType,      deleteSymptomType,
  toggleSymptomCategory, toggleSymptomType,
} from '@/lib/dal/symptoms';
import { batchSetSortOrder } from '@/lib/dal/settings';
import { bySortOrder, normalizedReorderUpdates } from '@/lib/utils/sort';
import { createClient }        from '@/lib/supabase/client';
import { Button }              from '@/components/ui';
import { CategoryBlock, ChildItem } from '@/components/settings/CategoryBlock';
import type { SymptomCategoryWithTypes } from '@/types/dal';

// ── Sort helper ───────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  categories: SymptomCategoryWithTypes[];
}

export function SymptomSettings({ categories: initial }: Readonly<Props>) {
  const supabase = createClient();
  const [cats, setCats] = useState(initial);

  // ── Category operations ─────────────────────────────────────────────────────

  const [newCatName, setNewCatName] = useState('');
  const [addingCat,  setAddingCat]  = useState(false);

  const addCategory = useCallback(async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const data = await addSymptomCategory(supabase, newCatName, cats.length);
      setCats(prev => [...prev, { ...data, types: [] }]);
      setNewCatName('');
    } finally { setAddingCat(false); }
  }, [supabase, newCatName, cats.length]);

  const renameCategory = useCallback(async (catId: number, name: string) => {
    await updateSymptomCategory(supabase, catId, name);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, category_name: name } : c));
  }, [supabase]);

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await toggleSymptomCategory(supabase, catId, active);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, is_active: active } : c));
  }, [supabase]);

  const deleteCategory = useCallback(async (catId: number) => {
    await deleteSymptomCategory(supabase, catId);
    setCats(prev => prev.filter(c => c.id !== catId));
  }, [supabase]);

  const moveCategory = useCallback(async (catId: number, direction: 'up' | 'down') => {
    const sorted  = [...cats].sort(bySortOrder);
    const idx     = sorted.findIndex(c => c.id === catId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updates = normalizedReorderUpdates(sorted, idx, swapIdx);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setCats(prev => prev.map(c => updateMap.has(c.id) ? { ...c, sort_order: updateMap.get(c.id)! } : c));
    await batchSetSortOrder(supabase, 'symptom_categories', updates);
  }, [supabase, cats]);

  // ── Type operations ─────────────────────────────────────────────────────────

  const [newTypeByCat, setNewTypeByCat] = useState<Record<number, string>>({});
  const [addingType,   setAddingType]   = useState<number | null>(null);

  const addType = useCallback(async (catId: number) => {
    const name = newTypeByCat[catId]?.trim();
    if (!name) return;
    setAddingType(catId);
    try {
      const cat  = cats.find(c => c.id === catId);
      const data = await addSymptomType(supabase, catId, name, cat?.types.length ?? 0);
      setCats(prev => prev.map(c =>
        c.id === catId ? { ...c, types: [...c.types, data] } : c
      ));
      setNewTypeByCat(prev => ({ ...prev, [catId]: '' }));
    } finally { setAddingType(null); }
  }, [supabase, newTypeByCat, cats]);

  const renameType = useCallback(async (catId: number, typeId: number, name: string) => {
    await updateSymptomType(supabase, typeId, name);
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, types: c.types.map(t => t.id === typeId ? { ...t, symptom_name: name } : t) }
        : c
    ));
  }, [supabase]);

  const toggleType = useCallback(async (catId: number, typeId: number, active: boolean) => {
    await toggleSymptomType(supabase, typeId, active);
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, types: c.types.map(t => t.id === typeId ? { ...t, is_active: active } : t) }
        : c
    ));
  }, [supabase]);

  const deleteType = useCallback(async (catId: number, typeId: number) => {
    await deleteSymptomType(supabase, typeId);
    setCats(prev => prev.map(c =>
      c.id === catId ? { ...c, types: c.types.filter(t => t.id !== typeId) } : c
    ));
  }, [supabase]);

  const moveType = useCallback(async (catId: number, typeId: number, direction: 'up' | 'down') => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    const sorted  = [...cat.types].sort(bySortOrder);
    const idx     = sorted.findIndex(t => t.id === typeId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updates = normalizedReorderUpdates(sorted, idx, swapIdx);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, types: c.types.map(t => updateMap.has(t.id) ? { ...t, sort_order: updateMap.get(t.id)! } : t) }
        : c
    ));
    await batchSetSortOrder(supabase, 'symptom_types', updates);
  }, [supabase, cats]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const sortedCats  = [...cats].sort(bySortOrder);
  const activeCats  = sortedCats.filter(c =>  c.is_active);
  const inactiveCats = sortedCats.filter(c => !c.is_active);

  const renderCategory = (cat: SymptomCategoryWithTypes) => {
    const activeCatIdx  = activeCats.findIndex(c => c.id === cat.id);
    const activeTypes   = [...cat.types].filter(t =>  t.is_active).sort(bySortOrder);
    const inactiveTypes = [...cat.types].filter(t => !t.is_active).sort(bySortOrder);

    return (
      <CategoryBlock
        key={cat.id}
        name={cat.category_name}
        is_active={cat.is_active}
        isFirst={activeCatIdx === 0}
        isLast={activeCatIdx === activeCats.length - 1}
        onMoveUp={()   => moveCategory(cat.id, 'up')}
        onMoveDown={()  => moveCategory(cat.id, 'down')}
        onRename={name  => renameCategory(cat.id, name)}
        onToggle={active => toggleCategory(cat.id, active)}
        onDelete={()    => deleteCategory(cat.id)}
        addRow={
          <div className="category-block__add-row">
            <input
              type="text"
              className="input--flex"
              value={newTypeByCat[cat.id] ?? ''}
              onChange={e => setNewTypeByCat(prev => ({ ...prev, [cat.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addType(cat.id)}
              placeholder={`Add ${cat.category_name.toLowerCase()} type…`}
            />
            <Button
              size="sm" variant="ghost"
              onClick={() => addType(cat.id)}
              disabled={addingType === cat.id || !newTypeByCat[cat.id]?.trim()}
            >
              {addingType === cat.id ? '…' : '+ Add'}
            </Button>
          </div>
        }
      >
        {activeTypes.length === 0 && inactiveTypes.length === 0 && (
          <p className="empty-state">No types yet.</p>
        )}

        {activeTypes.map((t, idx) => (
          <ChildItem
            key={t.id}
            name={t.symptom_name}
            is_active={t.is_active}
            isFirst={idx === 0}
            isLast={idx === activeTypes.length - 1}
            onMoveUp={()     => moveType(cat.id, t.id, 'up')}
            onMoveDown={()    => moveType(cat.id, t.id, 'down')}
            onRename={name    => renameType(cat.id, t.id, name)}
            onToggle={active  => toggleType(cat.id, t.id, active)}
            onDelete={()      => deleteType(cat.id, t.id)}
          />
        ))}

        {inactiveTypes.length > 0 && (
          <details className="category-block__details">
            <summary className="category-block__summary">
              {inactiveTypes.length} inactive
            </summary>
            {inactiveTypes.map(t => (
              <ChildItem
                key={t.id}
                name={t.symptom_name}
                is_active={t.is_active}
                isFirst={false} isLast={false}
                onMoveUp={() => {}} onMoveDown={() => {}}
                onRename={name   => renameType(cat.id, t.id, name)}
                onToggle={active => toggleType(cat.id, t.id, active)}
                onDelete={()     => deleteType(cat.id, t.id)}
              />
            ))}
          </details>
        )}
      </CategoryBlock>
    );
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">Symptom Types</span>
      </div>

      {activeCats.map(renderCategory)}

      {inactiveCats.length > 0 && (
        <details className="manage-inactive">
          <summary className="manage-inactive__summary">
            {inactiveCats.length} inactive {inactiveCats.length === 1 ? 'category' : 'categories'}
          </summary>
          <div className="manage-inactive__body">
            {inactiveCats.map(renderCategory)}
          </div>
        </details>
      )}

      <div className="category-block__footer">
        <input
          type="text"
          className="input--flex"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          placeholder="New category name…"
        />
        <Button size="sm" variant="accent" onClick={addCategory} disabled={addingCat || !newCatName.trim()}>
          {addingCat ? '…' : '+ Category'}
        </Button>
      </div>
    </div>
  );
}
