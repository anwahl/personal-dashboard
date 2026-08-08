'use client';

/**
 * HierarchicalList — reusable two-level list (category → children).
 *
 * Used by SymptomSettings (categories → types) and JournalSettings
 * (categories → prompts, both daily and weekly).
 *
 * The caller normalises their specific data types into NormalizedCat[] and
 * provides a `dal` object of pre-bound async functions. No Supabase client
 * or table-name knowledge lives in here.
 */

import { useState, useCallback }         from 'react';
import { Button }                         from '@/components/ui';
import { CategoryBlock, ChildItem }       from './CategoryBlock';
import { bySortOrder, normalizedReorderUpdates } from '@/lib/utils/sort';

// ── Normalised data shape ─────────────────────────────────────────────────────

export interface NormalizedChild {
  id:         number;
  name:       string;
  is_active:  boolean;
  sort_order: number;
}

export interface NormalizedCat {
  id:         number;
  name:       string;
  is_active:  boolean;
  sort_order: number;
  children:   NormalizedChild[];
}

// ── DAL interface ─────────────────────────────────────────────────────────────

/** Minimum shape that add operations must return. */
interface AddResult {
  id:          number;
  is_active:   boolean;
  sort_order?: number | null;
}

type SortUpdate = { id: number; sort_order: number };

export interface HierarchicalListDal {
  addCategory:       (name: string, sortOrder: number)                   => Promise<AddResult>;
  updateCategory:    (id: number, name: string)                          => Promise<void>;
  deleteCategory:    (id: number)                                        => Promise<void>;
  toggleCategory:    (id: number, active: boolean)                       => Promise<void>;
  reorderCategories: (updates: SortUpdate[])                             => Promise<void>;
  addChild:          (catId: number, name: string, sortOrder: number)    => Promise<AddResult>;
  updateChild:       (id: number, name: string)                          => Promise<void>;
  deleteChild:       (id: number)                                        => Promise<void>;
  toggleChild:       (id: number, active: boolean)                       => Promise<void>;
  reorderChildren:   (updates: SortUpdate[])                             => Promise<void>;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  title:             string;
  description?:      string;
  initialCategories: NormalizedCat[];
  /** 'input' (default) for short labels; 'textarea' for long prompt text. */
  childInputType?:   'input' | 'textarea';
  childItalic?:      boolean;
  /** Static string, or a fn that receives the category name for contextual placeholders. */
  childPlaceholder?: string | ((catName: string) => string);
  catPlaceholder?:   string;
  dal:               HierarchicalListDal;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HierarchicalList({
  title,
  description,
  initialCategories,
  childInputType   = 'input',
  childItalic      = false,
  childPlaceholder = 'Add item…',
  catPlaceholder   = 'New category…',
  dal,
}: Readonly<Props>) {
  const [cats,          setCats]          = useState<NormalizedCat[]>(initialCategories);
  const [newCatName,    setNewCatName]    = useState('');
  const [addingCat,     setAddingCat]     = useState(false);
  const [newChildByCat, setNewChildByCat] = useState<Record<number, string>>({});
  const [addingChild,   setAddingChild]   = useState<number | null>(null);

  // ── Category operations ───────────────────────────────────────────────────

  const addCategory = useCallback(async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const name = newCatName.trim();
      const data = await dal.addCategory(name, cats.length);
      setCats(prev => [...prev, {
        id: data.id, name, is_active: data.is_active,
        sort_order: data.sort_order ?? prev.length,
        children: [],
      }]);
      setNewCatName('');
    } finally { setAddingCat(false); }
  }, [dal, newCatName, cats.length]);

  const renameCategory = useCallback(async (catId: number, name: string) => {
    await dal.updateCategory(catId, name);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, name } : c));
  }, [dal]);

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await dal.toggleCategory(catId, active);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, is_active: active } : c));
  }, [dal]);

  const deleteCategory = useCallback(async (catId: number) => {
    await dal.deleteCategory(catId);
    setCats(prev => prev.filter(c => c.id !== catId));
  }, [dal]);

  const moveCategory = useCallback(async (catId: number, direction: 'up' | 'down') => {
    const sorted  = cats.filter(c => c.is_active).sort(bySortOrder);
    const idx     = sorted.findIndex(c => c.id === catId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updates   = normalizedReorderUpdates(sorted, idx, swapIdx);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setCats(prev => prev.map(c => updateMap.has(c.id) ? { ...c, sort_order: updateMap.get(c.id)! } : c));
    await dal.reorderCategories(updates);
  }, [dal, cats]);

  // ── Child operations ──────────────────────────────────────────────────────

  const addChild = useCallback(async (catId: number) => {
    const name = newChildByCat[catId]?.trim();
    if (!name) return;
    setAddingChild(catId);
    try {
      const cat  = cats.find(c => c.id === catId);
      const data = await dal.addChild(catId, name, cat?.children.length ?? 0);
      setCats(prev => prev.map(c =>
        c.id === catId
          ? { ...c, children: [...c.children, {
              id: data.id, name, is_active: data.is_active,
              sort_order: data.sort_order ?? c.children.length,
            }] }
          : c
      ));
      setNewChildByCat(prev => ({ ...prev, [catId]: '' }));
    } finally { setAddingChild(null); }
  }, [dal, newChildByCat, cats]);

  const renameChild = useCallback(async (catId: number, childId: number, name: string) => {
    await dal.updateChild(childId, name);
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, children: c.children.map(ch => ch.id === childId ? { ...ch, name } : ch) }
        : c
    ));
  }, [dal]);

  const toggleChild = useCallback(async (catId: number, childId: number, active: boolean) => {
    await dal.toggleChild(childId, active);
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, children: c.children.map(ch => ch.id === childId ? { ...ch, is_active: active } : ch) }
        : c
    ));
  }, [dal]);

  const deleteChild = useCallback(async (catId: number, childId: number) => {
    await dal.deleteChild(childId);
    setCats(prev => prev.map(c =>
      c.id === catId ? { ...c, children: c.children.filter(ch => ch.id !== childId) } : c
    ));
  }, [dal]);

  const moveChild = useCallback(async (catId: number, childId: number, direction: 'up' | 'down') => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    const sorted  = cat.children.filter(ch => ch.is_active).sort(bySortOrder);
    const idx     = sorted.findIndex(ch => ch.id === childId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updates   = normalizedReorderUpdates(sorted, idx, swapIdx);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, children: c.children.map(ch =>
            updateMap.has(ch.id) ? { ...ch, sort_order: updateMap.get(ch.id)! } : ch
          ) }
        : c
    ));
    await dal.reorderChildren(updates);
  }, [dal, cats]);

  // ── Render ────────────────────────────────────────────────────────────────

  const sortedCats    = [...cats].sort(bySortOrder);
  const activeCats    = sortedCats.filter(c =>  c.is_active);
  const inactiveCats  = sortedCats.filter(c => !c.is_active);

  const getPlaceholder = (catName: string) =>
    typeof childPlaceholder === 'function' ? childPlaceholder(catName) : childPlaceholder;

  const renderCategory = (cat: NormalizedCat) => {
    const activeCatIdx     = activeCats.findIndex(c => c.id === cat.id);
    const activeChildren   = cat.children.filter(ch =>  ch.is_active).sort(bySortOrder);
    const inactiveChildren = cat.children.filter(ch => !ch.is_active).sort(bySortOrder);
    const placeholder      = getPlaceholder(cat.name);

    return (
      <CategoryBlock
        key={cat.id}
        name={cat.name}
        is_active={cat.is_active}
        isFirst={activeCatIdx === 0}
        isLast={activeCatIdx === activeCats.length - 1}
        onMoveUp={()     => moveCategory(cat.id, 'up')}
        onMoveDown={()    => moveCategory(cat.id, 'down')}
        onRename={name    => renameCategory(cat.id, name)}
        onToggle={active  => toggleCategory(cat.id, active)}
        onDelete={()      => deleteCategory(cat.id)}
        addRow={
          <div className="category-block__add-row">
            {childInputType === 'textarea' ? (
              <textarea
                className="input--flex textarea--short"
                value={newChildByCat[cat.id] ?? ''}
                placeholder={placeholder}
                onChange={e => setNewChildByCat(prev => ({ ...prev, [cat.id]: e.target.value }))}
              />
            ) : (
              <input
                type="text"
                className="input--flex"
                value={newChildByCat[cat.id] ?? ''}
                placeholder={placeholder}
                onChange={e => setNewChildByCat(prev => ({ ...prev, [cat.id]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addChild(cat.id)}
              />
            )}
            <Button
              size="sm" variant="ghost"
              onClick={() => addChild(cat.id)}
              disabled={addingChild === cat.id || !newChildByCat[cat.id]?.trim()}
            >
              {addingChild === cat.id ? '…' : '+ Add'}
            </Button>
          </div>
        }
      >
        {activeChildren.length === 0 && inactiveChildren.length === 0 && (
          <p className="empty-state">No items yet.</p>
        )}

        {activeChildren.map((ch, idx) => (
          <ChildItem
            key={ch.id}
            name={ch.name}
            is_active={ch.is_active}
            italic={childItalic}
            multiline={childInputType === 'textarea'}
            isFirst={idx === 0}
            isLast={idx === activeChildren.length - 1}
            onMoveUp={()     => moveChild(cat.id, ch.id, 'up')}
            onMoveDown={()    => moveChild(cat.id, ch.id, 'down')}
            onRename={name    => renameChild(cat.id, ch.id, name)}
            onToggle={active  => toggleChild(cat.id, ch.id, active)}
            onDelete={()      => deleteChild(cat.id, ch.id)}
          />
        ))}

        {inactiveChildren.length > 0 && (
          <details className="category-block__details">
            <summary className="category-block__summary">
              {inactiveChildren.length} inactive
            </summary>
            {inactiveChildren.map(ch => (
              <ChildItem
                key={ch.id}
                name={ch.name}
                is_active={ch.is_active}
                italic={childItalic}
                multiline={childInputType === 'textarea'}
                isFirst={false} isLast={false}
                onMoveUp={() => {}} onMoveDown={() => {}}
                onRename={name    => renameChild(cat.id, ch.id, name)}
                onToggle={active  => toggleChild(cat.id, ch.id, active)}
                onDelete={()      => deleteChild(cat.id, ch.id)}
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
        <span className="settings-section__title">{title}</span>
      </div>
      {description && <p className="settings-section__desc">{description}</p>}

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
          placeholder={catPlaceholder}
        />
        <Button
          size="sm" variant="accent"
          onClick={addCategory}
          disabled={addingCat || !newCatName.trim()}
        >
          {addingCat ? '…' : '+ Category'}
        </Button>
      </div>
    </div>
  );
}