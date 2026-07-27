'use client';

import { useState, useCallback } from 'react';
import {
  addJournalCategory,
  toggleJournalCategory,
  addJournalPrompt,
  toggleJournalPrompt,
} from '@/lib/dal/journal';
import { createClient }  from '@/lib/supabase/client';
import { Button }        from '@/components/ui/Button';
import type { JournalCategoryWithPrompts } from '@/types/dal';

interface Props {
  categories: JournalCategoryWithPrompts[];
}

export function JournalSettings({ categories: initial }: Readonly<Props>) {
  const supabase = createClient();
  const [cats,   setCats]   = useState(initial);
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [newPromptByCat, setNewPromptByCat] = useState<Record<number, string>>({});
  const [addingPrompt,   setAddingPrompt]   = useState<number | null>(null);

  const addCategory = useCallback(async () => {
    if (!newCat.trim()) return;
    setAddingCat(true);
    try {
      const data = await addJournalCategory(supabase, newCat, cats.length);
      setCats(prev => [...prev, { ...data, prompts: [] }]);
      setNewCat('');
    } finally { setAddingCat(false); }
  }, [supabase, newCat, cats.length]);

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await toggleJournalCategory(supabase, catId, active);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, is_active: active } : c));
  }, [supabase]);

  const addPrompt = useCallback(async (catId: number) => {
    const text = newPromptByCat[catId]?.trim();
    if (!text) return;
    setAddingPrompt(catId);
    try {
      const data = await addJournalPrompt(supabase, catId, text);
      if (data) {
        setCats(prev => prev.map(c =>
          c.id === catId ? { ...c, prompts: [...c.prompts, data] } : c
        ));
        setNewPromptByCat(prev => ({ ...prev, [catId]: '' }));
      }
    } finally { setAddingPrompt(null); }
  }, [supabase, newPromptByCat]);

  const togglePrompt = useCallback(async (catId: number, promptId: number, active: boolean) => {
    await toggleJournalPrompt(supabase, promptId, active);
    setCats(prev => prev.map(c =>
      c.id === catId
        ? { ...c, prompts: c.prompts.map(p => p.id === promptId ? { ...p, is_active: active } : p) }
        : c
    ));
  }, [supabase]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">Journal Prompts</span>
      </div>
      <p className="settings-section__desc">
        Prompts are randomly selected when creating journal entries.
      </p>

      {cats.map(cat => {
        const active   = cat.prompts.filter(p =>  p.is_active);
        const inactive = cat.prompts.filter(p => !p.is_active);

        return (
          <div key={cat.id} className="category-block">
            <div className="category-block__header">
              <span className={`category-block__name${cat.is_active ? '' : ' category-block__name--inactive'}`}>
                {cat.category_name}{' '}
                <span className="category-block__count">({active.length} prompts)</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => toggleCategory(cat.id, !cat.is_active)}>
                {cat.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>

            <div className="category-block__body">
              {active.map(p => (
                <div key={p.id} className="manage-item">
                  <span className="manage-item__name manage-item__name--italic">
                    &ldquo;{p.prompt_text}&rdquo;
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => togglePrompt(cat.id, p.id, false)}>✕</Button>
                </div>
              ))}

              {inactive.length > 0 && (
                <details className="category-block__details">
                  <summary className="category-block__summary">
                    {inactive.length} inactive
                  </summary>
                  {inactive.map(p => (
                    <div key={p.id} className="manage-item manage-item--inactive">
                      <span className="manage-item__name manage-item__name--italic">
                        &ldquo;{p.prompt_text}&rdquo;
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => togglePrompt(cat.id, p.id, true)}>Activate</Button>
                    </div>
                  ))}
                </details>
              )}

              <div className="category-block__add-row">
                <textarea
                  className="input--flex textarea--short"
                  value={newPromptByCat[cat.id] ?? ''}
                  onChange={e => setNewPromptByCat(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder="New prompt…"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addPrompt(cat.id)}
                  disabled={addingPrompt === cat.id || !newPromptByCat[cat.id]?.trim()}
                >
                  {addingPrompt === cat.id ? '…' : '+ Add'}
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
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          placeholder="New category…"
        />
        <Button size="sm" variant="accent" onClick={addCategory} disabled={addingCat || !newCat.trim()}>
          {addingCat ? '…' : '+ Category'}
        </Button>
      </div>
    </div>
  );
}
