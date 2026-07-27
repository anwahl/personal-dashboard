'use client';

import { useState, useCallback } from 'react';
import {
  addSymptomCategory,
  addSymptomType,
  toggleSymptomCategory,
  toggleSymptomType,
} from '@/lib/dal/symptoms';
import { createClient }  from '@/lib/supabase/client';
import { Button }        from '@/components/ui/Button';
import type { SymptomCategoryWithTypes } from '@/types/dal';
import type { SymptomTypeRow }           from '@/types/schema';

type SymptomType = SymptomTypeRow;

// ── Pure state helpers ────────────────────────────────────────────────────────

function updateCategoryActiveState(
  categories: SymptomCategoryWithTypes[],
  catId: number,
  active: boolean,
) {
  return categories.map(c => c.id === catId ? { ...c, is_active: active } : c);
}

function appendTypeToCategory(
  categories: SymptomCategoryWithTypes[],
  catId: number,
  type: SymptomType,
) {
  return categories.map(c =>
    c.id === catId ? { ...c, types: [...c.types, type] } : c
  );
}

function setTypeActiveState(
  categories: SymptomCategoryWithTypes[],
  catId: number,
  typeId: number,
  active: boolean,
) {
  return categories.map(c =>
    c.id === catId
      ? { ...c, types: c.types.map(t => t.id === typeId ? { ...t, is_active: active } : t) }
      : c
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  categories: SymptomCategoryWithTypes[];
}

export function SymptomSettings({ categories: initial }: Readonly<Props>) {
  const supabase = createClient();
  const [cats, setCats] = useState(initial);

  // ── Categories ─────────────────────────────────────────────────────────────

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

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await toggleSymptomCategory(supabase, catId, active);
    setCats(prev => updateCategoryActiveState(prev, catId, active));
  }, [supabase]);

  // ── Types ───────────────────────────────────────────────────────────────────

  const [newTypeByCat, setNewTypeByCat] = useState<Record<number, string>>({});
  const [addingType,   setAddingType]   = useState<number | null>(null);

  const addType = useCallback(async (catId: number) => {
    const name = newTypeByCat[catId]?.trim();
    if (!name) return;
    setAddingType(catId);
    try {
      const cat  = cats.find(c => c.id === catId);
      const data = await addSymptomType(supabase, catId, name, cat?.types.length ?? 0);
      setCats(prev => appendTypeToCategory(prev, catId, data));
      setNewTypeByCat(prev => ({ ...prev, [catId]: '' }));
    } finally { setAddingType(null); }
  }, [supabase, newTypeByCat, cats]);

  const toggleType = useCallback(async (catId: number, typeId: number, active: boolean) => {
    await toggleSymptomType(supabase, typeId, active);
    setCats(prev => setTypeActiveState(prev, catId, typeId, active));
  }, [supabase]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">Symptom Types</span>
      </div>

      {cats.map(cat => {
        const activeTypes   = cat.types.filter(t =>  t.is_active);
        const inactiveTypes = cat.types.filter(t => !t.is_active);

        return (
          <div key={cat.id} className="category-block">
            <div className="category-block__header">
              <span className={`category-block__name${cat.is_active ? '' : ' category-block__name--inactive'}`}>
                {cat.category_name}
              </span>
              <Button size="sm" variant="ghost" onClick={() => toggleCategory(cat.id, !cat.is_active)}>
                {cat.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>

            <div className="category-block__body">
              {activeTypes.map(t => (
                <div key={t.id} className="manage-item">
                  <span className="manage-item__name">{t.symptom_name}</span>
                  <Button size="sm" variant="ghost" onClick={() => toggleType(cat.id, t.id, false)}>Deactivate</Button>
                </div>
              ))}

              {inactiveTypes.length > 0 && (
                <details className="category-block__details">
                  <summary className="category-block__summary">
                    {inactiveTypes.length} inactive
                  </summary>
                  {inactiveTypes.map(t => (
                    <div key={t.id} className="manage-item manage-item--inactive">
                      <span className="manage-item__name">{t.symptom_name}</span>
                      <Button size="sm" variant="ghost" onClick={() => toggleType(cat.id, t.id, true)}>Activate</Button>
                    </div>
                  ))}
                </details>
              )}

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
                  size="sm"
                  variant="ghost"
                  onClick={() => addType(cat.id)}
                  disabled={addingType === cat.id || !newTypeByCat[cat.id]?.trim()}
                >
                  {addingType === cat.id ? '…' : '+ Add'}
                </Button>
              </div>
            </div>
          </div>
        );
      })}

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
