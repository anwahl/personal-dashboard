'use client';

/**
 * components/daily-log/JournalTab.tsx
 *
 * Journal prompts tab for the daily entry card.
 *
 * Input mode:
 *   - Category chips toggle categories on/off
 *   - Each active category shows one or more prompt cards (random prompt from that category)
 *   - "+ Another" adds a new card from the same category (avoids repeats when possible)
 *   - "🔀 Different" swaps the current card's prompt
 *   - "✕" removes a card
 *   - Save button saves all cards (also wired to global daily Save All)
 *
 * View mode:
 *   - Responses grouped by category, read-only
 */

import { SaveStatus, SaveState } from '@/components/ui/Display';
import { useId }       from 'react';
import { Button }      from '@/components/ui/Button';
import type { JournalCategoryWithPrompts } from '@/types/dal';
import type { JournalCard, JournalState } from './DailyPageClient';

type Mode = 'view' | 'input';

interface Props {
  mode:          Mode;
  entryId:       number;
  categories:    JournalCategoryWithPrompts[];
  state:         JournalState;
  setState:      React.Dispatch<React.SetStateAction<JournalState>>;
  onSave:        () => Promise<void>;
  saveState:     SaveState;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _seq = 0;
function nextId() { return `j-${++_seq}`; }

function pickRandom<T>(arr: T[], excluding?: T[]): T | null {
  const pool = excluding?.length ? arr.filter(x => !excluding.includes(x)) : arr;
  if (!pool.length) return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── PromptCard ────────────────────────────────────────────────────────────────

function PromptCard({
  card, category, allCards, onUpdate, onShuffle, onRemove,
}: {
  card:      JournalCard;
  category:  JournalCategoryWithPrompts;
  allCards:  JournalState;
  onUpdate:  (id: string, text: string) => void;
  onShuffle: (id: string) => void;
  onRemove:  (id: string) => void;
}) {
  return (
    <div className="journal-prompt-card">
      <p className="journal-prompt-card__prompt">{card.promptText}</p>
      <textarea
        className="journal-prompt-card__textarea"
        value={card.responseText}
        placeholder="Your response…"
        onChange={e => onUpdate(card.clientId, e.target.value)}
        rows={3}
      />
      <div className="journal-prompt-card__actions">
        <Button variant="ghost" size="sm" onClick={() => onShuffle(card.clientId)}>
          🔀 Different prompt
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onRemove(card.clientId)}>
          ✕ Remove
        </Button>
      </div>
    </div>
  );
}

// ── Category section (input mode) ─────────────────────────────────────────────

function CategorySection({
  category, cards, allCards, onUpdate, onShuffle, onRemove, onAddAnother,
}: {
  category:    JournalCategoryWithPrompts;
  cards:       JournalCard[];
  allCards:    JournalState;
  onUpdate:    (id: string, text: string) => void;
  onShuffle:   (id: string) => void;
  onRemove:    (id: string) => void;
  onAddAnother:(categoryId: number) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="journal-category-section">
      <div className="journal-category-section__header">
        <span className="journal-category-section__title">
          {category.category_name}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onAddAnother(category.id)}>
          + Another
        </Button>
      </div>
      {cards.map(card => (
        <PromptCard
          key={card.clientId}
          card={card}
          category={category}
          allCards={allCards}
          onUpdate={onUpdate}
          onShuffle={onShuffle}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// ── JournalTab ────────────────────────────────────────────────────────────────

export function JournalTab({ mode, entryId, categories, state, setState, onSave, saveState }: Props) {

  // Which category IDs are currently active (have cards)
  const activeCategoryIds = new Set(state.map(c => c.categoryId));

  const toggleCategory = (cat: JournalCategoryWithPrompts) => {
    if (activeCategoryIds.has(cat.id)) {
      // Deactivate — remove all cards for this category
      setState(prev => prev.filter(c => c.categoryId !== cat.id));
    } else {
      // Activate — add one random prompt card
      const existingPromptIds = state
        .filter(c => c.categoryId === cat.id)
        .map(c => c.promptId);
      const prompt = pickRandom(cat.prompts, cat.prompts.filter(p => existingPromptIds.includes(p.id)));
      if (!prompt) return;
      setState(prev => [...prev, {
        clientId:    nextId(),
        categoryId:  cat.id,
        promptId:    prompt.id,
        promptText:  prompt.prompt_text,
        responseText: '',
        dbId:        null,
      }]);
    }
  };

  const addAnother = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    const usedPromptIds = state.filter(c => c.categoryId === categoryId).map(c => c.promptId);
    const unusedPrompts = cat.prompts.filter(p => !usedPromptIds.includes(p.id));
    const pool          = unusedPrompts.length ? unusedPrompts : cat.prompts;
    if (!pool.length) return;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    setState(prev => [...prev, {
      clientId:    nextId(),
      categoryId,
      promptId:    prompt.id,
      promptText:  prompt.prompt_text,
      responseText: '',
      dbId:        null,
    }]);
  };

  const updateCard = (clientId: string, text: string) => {
    setState(prev => prev.map(c => c.clientId === clientId ? { ...c, responseText: text } : c));
  };

  const shuffleCard = (clientId: string) => {
    const card = state.find(c => c.clientId === clientId);
    if (!card) return;
    const cat = categories.find(c => c.id === card.categoryId);
    if (!cat) return;
    const usedIds = state
      .filter(c => c.categoryId === card.categoryId && c.clientId !== clientId)
      .map(c => c.promptId);
    const pool = cat.prompts.filter(p => !usedIds.includes(p.id));
    const next = pickRandom(pool.length ? pool : cat.prompts);
    if (!next) return;
    setState(prev => prev.map(c =>
      c.clientId !== clientId ? c : { ...c, promptId: next.id, promptText: next.prompt_text, responseText: '' }
    ));
  };

  const removeCard = (clientId: string) => {
    setState(prev => prev.filter(c => c.clientId !== clientId));
  };

  // ── View mode ───────────────────────────────────────────────────────────────

  if (mode === 'view') {
    if (state.length === 0) {
      return <p className="empty-state">No journal entries for this day.</p>;
    }

    // Group by category
    const grouped = new Map<string, JournalCard[]>();
    for (const card of state) {
      const cat = categories.find(c => c.id === card.categoryId);
      const key = cat?.category_name ?? 'Other';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(card);
    }

    return (
      <div>
        {[...grouped.entries()].map(([catName, cards]) => (
          <div key={catName} className="journal-view-category">
            <p className="card__section-label">{catName}</p>
            {cards.filter(c => c.responseText.trim()).map(card => (
              <div key={card.clientId} className="journal-view-entry">
                <p className="journal-view-entry__prompt">{card.promptText}</p>
                <p className="journal-view-entry__response">{card.responseText}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // ── Input mode ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Category chips */}
      <div className="journal-category-chips">
        <p className="journal-category-chips__label">What do you feel like exploring today?</p>
        <div className="chip-group">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`chip chip--sm${activeCategoryIds.has(cat.id) ? ' chip--active' : ''}`}
              onClick={() => toggleCategory(cat)}
              disabled={cat.prompts.length === 0}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt sections */}
      {state.length === 0 && (
        <p className="empty-state journal-category-chips__empty">
          Toggle some categories above to get started.
        </p>
      )}

      {categories
        .filter(cat => activeCategoryIds.has(cat.id))
        .map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            cards={state.filter(c => c.categoryId === cat.id)}
            allCards={state}
            onUpdate={updateCard}
            onShuffle={shuffleCard}
            onRemove={removeCard}
            onAddAnother={addAnother}
          />
        ))}

      {/* Tab-level save */}
      <div className="journal-save-row">
        <Button variant="accent" size="sm" onClick={onSave} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : '💾 Save journal'}
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </div>
  );
}
