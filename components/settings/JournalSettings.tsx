'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button }       from '@/components/ui/Button';
import type { JournalCategoryWithPrompts } from '@/types/dal';

interface Props {
  categories: JournalCategoryWithPrompts[];
}

export function JournalSettings({ categories: initial }: Props) {
  const supabase = createClient();
  const [cats,   setCats]   = useState(initial);
  const [newCat, setNewCat] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [newPromptByCat, setNewPromptByCat] = useState<Record<number, string>>({});
  const [addingPrompt, setAddingPrompt] = useState<number | null>(null);

  const addCategory = useCallback(async () => {
    if (!newCat.trim()) return;
    setAddingCat(true);
    try {
      const { data } = await supabase
        .from('journal_categories')
        .insert({ category_name: newCat.trim(), sort_order: cats.length })
        .select().single();
      if (data) { setCats(prev => [...prev, { ...data, prompts: [] }]); setNewCat(''); }
    } finally { setAddingCat(false); }
  }, [supabase, newCat, cats.length]);

  const toggleCategory = useCallback(async (catId: number, active: boolean) => {
    await supabase.from('journal_categories').update({ is_active: active }).eq('id', catId);
    setCats(prev => prev.map(c => c.id === catId ? { ...c, is_active: active } : c));
  }, [supabase]);

  const addPrompt = useCallback(async (catId: number) => {
    const text = newPromptByCat[catId]?.trim();
    if (!text) return;
    setAddingPrompt(catId);
    try {
      const { data } = await supabase
        .from('journal_prompts')
        .insert({ category_id: catId, prompt_text: text })
        .select().single();
      if (data) {
        setCats(prev => prev.map(c => c.id === catId
          ? { ...c, prompts: [...c.prompts, data] }
          : c
        ));
        setNewPromptByCat(prev => ({ ...prev, [catId]: '' }));
      }
    } finally { setAddingPrompt(null); }
  }, [supabase, newPromptByCat]);

  const togglePrompt = useCallback(async (catId: number, promptId: number, active: boolean) => {
    await supabase.from('journal_prompts').update({ is_active: active }).eq('id', promptId);
    setCats(prev => prev.map(c => c.id === catId
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
        const active   = cat.prompts.filter(p => p.is_active);
        const inactive = cat.prompts.filter(p => !p.is_active);

        return (
          <div key={cat.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: cat.is_active ? 'var(--text)' : 'var(--text-faint)' }}>
                {cat.category_name} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({active.length} prompts)</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => toggleCategory(cat.id, !cat.is_active)}>
                {cat.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>

            <div style={{ paddingLeft: 12 }}>
              {active.map(p => (
                <div key={p.id} className="manage-item">
                  <span className="manage-item__name" style={{ fontSize: '0.83rem', fontStyle: 'italic' }}>
                    "{p.prompt_text}"
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => togglePrompt(cat.id, p.id, false)}>✕</Button>
                </div>
              ))}
              {inactive.length > 0 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: '0.72rem', color: 'var(--text-faint)', cursor: 'pointer' }}>
                    {inactive.length} inactive
                  </summary>
                  {inactive.map(p => (
                    <div key={p.id} className="manage-item manage-item--inactive">
                      <span className="manage-item__name" style={{ fontSize: '0.83rem', fontStyle: 'italic' }}>
                        "{p.prompt_text}"
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => togglePrompt(cat.id, p.id, true)}>Activate</Button>
                    </div>
                  ))}
                </details>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <textarea
                  value={newPromptByCat[cat.id] ?? ''}
                  onChange={e => setNewPromptByCat(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder="New prompt…"
                  style={{ flex: 1, minHeight: 60, resize: 'vertical' }}
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

      <div style={{ display: 'flex', gap: 6, paddingTop: 8 }}>
        <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCategory()}
          placeholder="New category…" style={{ flex: 1 }} />
        <Button size="sm" variant="accent" onClick={addCategory} disabled={addingCat || !newCat.trim()}>
          {addingCat ? '…' : '+ Category'}
        </Button>
      </div>
    </div>
  );
}
