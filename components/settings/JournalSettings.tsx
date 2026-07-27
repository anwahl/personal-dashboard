'use client';

import { useState, useCallback } from 'react';
import {
  addJournalCategory,    updateJournalCategory, deleteJournalCategory,
  toggleJournalCategory,
  addJournalPrompt,      updateJournalPrompt,   deleteJournalPrompt,
  toggleJournalPrompt,
} from '@/lib/dal/journal';
import { batchSetSortOrder } from '@/lib/dal/settings';
import { bySortOrder, normalizedReorderUpdates } from '@/lib/utils/sort';
import { createClient }        from '@/lib/supabase/client';
import { Button }              from '@/components/ui/Button';
import { CategoryBlock, ChildItem } from '@/components/settings/CategoryBlock';
import type { JournalCategoryWithPrompts } from '@/types/dal';

interface Props {
  categories: JournalCategoryWithPrompts[];
}

export function JournalSettings({ categories: initial }: Readonly<Props>) {
  const supabase = createClient();
  const [cats, setCats] = useState(initial);

  // ── Category operations ─────────────────────────────────────────────────────

  const [newCatName, setNewCatName] = useState('');
  const [addingCat,  setAddingCat]  = useState(false);

  const addCategory = useCallback(async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const data = await addJournalCategory(supabase, newCatName, cats.length);
      setCats(prev => [...prev, { ...data, prompts: [] }]);
      setNewCatName('');
    } finally { setAddingCat(false); }
  }, [supabase, newCatName, cats.length]);

  const renameCategory = useCallback(async (catId: number, name: string) => {
    await updateJournalCategory(supabase, catId, name);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, category_name: name } : c));
  }, [supabase]);

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await toggleJournalCategory(supabase, catId, active);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, is_active: active } : c));
  }, [supabase]);

  const deleteCategory = useCallback(async (catId: number) => {
    await deleteJournalCategory(supabase, catId);
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
    await batchSetSortOrder(supabase, 'journal_categories', updates);
  }, [supabase, cats]);

  // ── Prompt operations ───────────────────────────────────────────────────────

  const [newPromptByCat, setNewPromptByCat] = useState<Record<number, string>>({});
  const [addingPrompt,   setAddingPrompt]   = useState<number | null>(null);

  const addPrompt = useCallback(async (catId: number) => {
    const text = newPromptByCat[catId]?.trim();
    if (!text) return;
    setAddingPrompt(catId);
    try {
      const data = await addJournalPrompt(supabase, catId, text);
      setCats(prev => prev.map(c =>
        c.id === catId ? { ...c, prompts: [...c.prompts, data] } : c
      ));
      setNewPromptByCat(prev => ({ ...prev, [catId]: '' }));
    } finally { setAddingPrompt(null); }
  }, [supabase, newPromptByCat]);

  const renamePrompt = useCallback(async (catId: number, promptId: number, text: string) => {
    await updateJournalPrompt(supabase, promptId, text);
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, prompts: c.prompts.map(p => p.id === promptId ? { ...p, prompt_text: text } : p) }
        : c
    ));
  }, [supabase]);

  const togglePrompt = useCallback(async (catId: number, promptId: number, active: boolean) => {
    await toggleJournalPrompt(supabase, promptId, active);
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, prompts: c.prompts.map(p => p.id === promptId ? { ...p, is_active: active } : p) }
        : c
    ));
  }, [supabase]);

  const deletePrompt = useCallback(async (catId: number, promptId: number) => {
    await deleteJournalPrompt(supabase, promptId);
    setCats(prev => prev.map(c =>
      c.id === catId ? { ...c, prompts: c.prompts.filter(p => p.id !== promptId) } : c
    ));
  }, [supabase]);

  const movePrompt = useCallback(async (catId: number, promptId: number, direction: 'up' | 'down') => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    const sorted  = [...cat.prompts].sort(bySortOrder);
    const idx     = sorted.findIndex(p => p.id === promptId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updates = normalizedReorderUpdates(sorted, idx, swapIdx);
    const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, prompts: c.prompts.map(p => updateMap.has(p.id) ? { ...p, sort_order: updateMap.get(p.id)! } : p) }
        : c
    ));
    await batchSetSortOrder(supabase, 'journal_prompts', updates);
  }, [supabase, cats]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const sortedCats   = [...cats].sort(bySortOrder);
  const activeCats   = sortedCats.filter(c =>  c.is_active);
  const inactiveCats = sortedCats.filter(c => !c.is_active);

  const renderCategory = (cat: JournalCategoryWithPrompts) => {
    const activeCatIdx   = activeCats.findIndex(c => c.id === cat.id);
    const activePrompts  = [...cat.prompts].filter(p =>  p.is_active).sort(bySortOrder);
    const inactivePrompts = [...cat.prompts].filter(p => !p.is_active).sort(bySortOrder);

    return (
      <CategoryBlock
        key={cat.id}
        name={cat.category_name}
        is_active={cat.is_active}
        isFirst={activeCatIdx === 0}
        isLast={activeCatIdx === activeCats.length - 1}
        onMoveUp={()    => moveCategory(cat.id, 'up')}
        onMoveDown={()   => moveCategory(cat.id, 'down')}
        onRename={name   => renameCategory(cat.id, name)}
        onToggle={active => toggleCategory(cat.id, active)}
        onDelete={()     => deleteCategory(cat.id)}
        addRow={
          <div className="category-block__add-row">
            <textarea
              className="input--flex textarea--short"
              value={newPromptByCat[cat.id] ?? ''}
              onChange={e => setNewPromptByCat(prev => ({ ...prev, [cat.id]: e.target.value }))}
              placeholder="New prompt…"
            />
            <Button
              size="sm" variant="ghost"
              onClick={() => addPrompt(cat.id)}
              disabled={addingPrompt === cat.id || !newPromptByCat[cat.id]?.trim()}
            >
              {addingPrompt === cat.id ? '…' : '+ Add'}
            </Button>
          </div>
        }
      >
        {activePrompts.length === 0 && inactivePrompts.length === 0 && (
          <p className="empty-state">No prompts yet.</p>
        )}

        {activePrompts.map((p, idx) => (
          <ChildItem
            key={p.id}
            name={p.prompt_text}
            is_active={p.is_active}
            italic
            isFirst={idx === 0}
            isLast={idx === activePrompts.length - 1}
            onMoveUp={()    => movePrompt(cat.id, p.id, 'up')}
            onMoveDown={()   => movePrompt(cat.id, p.id, 'down')}
            onRename={text   => renamePrompt(cat.id, p.id, text)}
            onToggle={active => togglePrompt(cat.id, p.id, active)}
            onDelete={()     => deletePrompt(cat.id, p.id)}
          />
        ))}

        {inactivePrompts.length > 0 && (
          <details className="category-block__details">
            <summary className="category-block__summary">
              {inactivePrompts.length} inactive
            </summary>
            {inactivePrompts.map(p => (
              <ChildItem
                key={p.id}
                name={p.prompt_text}
                is_active={p.is_active}
                italic
                isFirst={false} isLast={false}
                onMoveUp={() => {}} onMoveDown={() => {}}
                onRename={text   => renamePrompt(cat.id, p.id, text)}
                onToggle={active => togglePrompt(cat.id, p.id, active)}
                onDelete={()     => deletePrompt(cat.id, p.id)}
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
        <span className="settings-section__title">Journal Prompts</span>
      </div>
      <p className="settings-section__desc">
        Prompts are randomly selected when creating journal entries.
      </p>

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
          placeholder="New category…"
        />
        <Button size="sm" variant="accent" onClick={addCategory} disabled={addingCat || !newCatName.trim()}>
          {addingCat ? '…' : '+ Category'}
        </Button>
      </div>
    </div>
  );
}
