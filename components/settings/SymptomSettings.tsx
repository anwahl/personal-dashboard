'use client';

import { useState, useCallback } from 'react';
import { toggleSymptomCategory, toggleSymptomType, addSymptomType } from '@/lib/dal/symptoms';
import { createClient } from '@/lib/supabase/client';
import { Button }       from '@/components/ui/Button';
import type { SymptomCategoryWithTypes } from '@/types/dal';

type SymptomType = SymptomCategoryWithTypes['types'][number];

function updateCategoryActiveState(
  categories: SymptomCategoryWithTypes[],
  catId: number,
  active: boolean
) {
  return categories.map(category =>
    category.id === catId ? { ...category, is_active: active } : category
  );
}

function appendTypeToCategory(
  categories: SymptomCategoryWithTypes[],
  catId: number,
  type: SymptomType
) {
  return categories.map(category =>
    category.id === catId
      ? { ...category, types: [...category.types, type] }
      : category
  );
}

function setTypeActiveState(
  categories: SymptomCategoryWithTypes[],
  catId: number,
  typeId: number,
  active: boolean
) {
  return categories.map(category =>
    category.id === catId
      ? {
          ...category,
          types: category.types.map(type =>
            type.id === typeId ? { ...type, is_active: active } : type
          ),
        }
      : category
  );
}

interface Props {
  categories: SymptomCategoryWithTypes[];
}

export function SymptomSettings({ categories: initial }: Readonly<Props>) {
  const supabase    = createClient();
  const [cats, setCats] = useState(initial);

  // ── Categories ────────────────────────────────────────────────────────────

  const [newCatName, setNewCatName] = useState('');
  const [addingCat,  setAddingCat]  = useState(false);

  const addCategory = useCallback(async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const { data } = await supabase
        .from('symptom_categories')
        .insert({ category_name: newCatName.trim(), sort_order: cats.length })
        .select().single();
      if (data) { setCats(prev => [...prev, { ...data, types: [] }]); setNewCatName(''); }
    } finally { setAddingCat(false); }
  }, [supabase, newCatName, cats.length]);

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await toggleSymptomCategory(supabase, catId, active);
    setCats(prev => updateCategoryActiveState(prev, catId, active));
  }, [supabase]);

  // ── Types ─────────────────────────────────────────────────────────────────

  const [newTypeByCat, setNewTypeByCat] = useState<Record<number, string>>({});
  const [addingType, setAddingType] = useState<number | null>(null);

  const addType = useCallback(async (catId: number) => {
    const name = newTypeByCat[catId]?.trim();
    if (!name) return;
    setAddingType(catId);
    try {
      const cat = cats.find(c => c.id === catId);
      const { data } = await supabase
        .from('symptom_types')
        .insert({ category_id: catId, symptom_name: name, sort_order: cat?.types.length ?? 0 })
        .select().single();
      if (data) {
        setCats(prev => appendTypeToCategory(prev, catId, data));
        setNewTypeByCat(prev => ({ ...prev, [catId]: '' }));
      }
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
        const activeTypes   = cat.types.filter(t => t.is_active);
        const inactiveTypes = cat.types.filter(t => !t.is_active);

        return (
          <div key={cat.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            {/* Category header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: cat.is_active ? 'var(--text)' : 'var(--text-faint)' }}>
                {cat.category_name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleCategory(cat.id, !cat.is_active)}
              >
                {cat.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>

            {/* Active types */}
            <div style={{ paddingLeft: 12 }}>
              {activeTypes.map(t => (
                <div key={t.id} className="manage-item">
                  <span className="manage-item__name" style={{ fontSize: '0.83rem' }}>{t.symptom_name}</span>
                  <Button size="sm" variant="ghost" onClick={() => toggleType(cat.id, t.id, false)}>Deactivate</Button>
                </div>
              ))}
              {inactiveTypes.length > 0 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: '0.72rem', color: 'var(--text-faint)', cursor: 'pointer' }}>
                    {inactiveTypes.length} inactive
                  </summary>
                  {inactiveTypes.map(t => (
                    <div key={t.id} className="manage-item manage-item--inactive">
                      <span className="manage-item__name" style={{ fontSize: '0.83rem' }}>{t.symptom_name}</span>
                      <Button size="sm" variant="ghost" onClick={() => toggleType(cat.id, t.id, true)}>Activate</Button>
                    </div>
                  ))}
                </details>
              )}

              {/* Add type */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  type="text"
                  value={newTypeByCat[cat.id] ?? ''}
                  onChange={e => setNewTypeByCat(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addType(cat.id)}
                  placeholder={`Add ${cat.category_name.toLowerCase()} type…`}
                  style={{ flex: 1 }}
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

      {/* Add category */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 8 }}>
        <input
          type="text"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          placeholder="New category name…"
          style={{ flex: 1 }}
        />
        <Button size="sm" variant="accent" onClick={addCategory} disabled={addingCat || !newCatName.trim()}>
          {addingCat ? '…' : '+ Category'}
        </Button>
      </div>
    </div>
  );
}
