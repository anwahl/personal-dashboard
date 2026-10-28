'use client';

/**
 * components/daily-log/JournalTab.tsx
 *
 * Journal prompts tab for the daily entry card.
 *
 * Input mode:
 *   - Category chips toggle categories on/off
 *   - Each active category is a section with one or more prompts (random prompt from that category)
 *   - "+ Another" adds a prompt from the same category (avoids repeats when possible)
 *   - Each prompt's ⋯ menu: "Change prompt" swaps it, "Remove" removes it.
 *     Both throw away the response, so a saved one needs a second tap.
 *   - Save button saves all responses (also wired to global daily Save All)
 *
 * View mode:
 *   - Responses grouped by category, read-only
 */

import {
  SaveStatus, SaveState, Button, EmptyState, ChipSelect, TextAreaField, Field, InputField, RowMenu,
  CardActions, CardSection, CardSectionHeader, CardSectionLabel,
} from '@/components/ui';
import type { JournalCategoryWithPrompts } from '@/types/dal';

/** One prompt on the page and the response typed for it. */
export interface JournalPromptResponse {
  clientId:     string;    // browser-side key
  categoryId:   number;
  promptId:     number;
  promptText:   string;
  responseText: string;
  dbId:         number | null;  // null = not yet saved to DB
}

type Mode = 'view' | 'input';

interface Props {
  mode:          Mode;
  categories:    JournalCategoryWithPrompts[];
  responses:     JournalPromptResponse[];
  setResponses:  React.Dispatch<React.SetStateAction<JournalPromptResponse[]>>;
  onSave:        () => Promise<void>;
  saveState:     SaveState;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _seq = 0;
function nextId() { return `j-${++_seq}`; }

function pickRandom<T>(arr: T[], excluding?: T[]): T | null {
  const pool = excluding?.length ? arr.filter(x => !excluding.includes(x)) : arr;
  if (!pool.length) return arr.length ? arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length] : null;
  return pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length];
}

// ── PromptField ───────────────────────────────────────────────────────────────

function PromptField({
  response, onUpdate, onChangePrompt, onRemove,
}: Readonly<{
  response:       JournalPromptResponse;
  onUpdate:       (id: string, text: string) => void;
  onChangePrompt: (id: string) => void;
  onRemove:       (id: string) => void;
}>) {
  // Unsaved responses can go without asking; saved ones need a second tap.
  const saved = response.dbId != null;
  return (
    <TextAreaField
      label={response.promptText}
      actions={
        <RowMenu label={response.promptText} items={[
          { label: 'Change prompt', onSelect: () => onChangePrompt(response.clientId), destructive: saved },
          { label: 'Remove',        onSelect: () => onRemove(response.clientId),       destructive: saved },
        ]} />
      }
      value={response.responseText}
      placeholder="Your response…"
      onChange={v => onUpdate(response.clientId, v)}
      rows={3}
    />
  );
}

// ── Category section (input mode) ─────────────────────────────────────────────

function CategorySection({
  category, responses, onUpdate, onChangePrompt, onRemove, onAddAnother,
}: Readonly<{
  category:       JournalCategoryWithPrompts;
  responses:      JournalPromptResponse[];
  onUpdate:       (id: string, text: string) => void;
  onChangePrompt: (id: string) => void;
  onRemove:       (id: string) => void;
  onAddAnother:   (categoryId: number) => void;
}>) {
  if (responses.length === 0) return null;
  return (
    <CardSection>
      <CardSectionHeader>
        <CardSectionLabel>{category.category_name}</CardSectionLabel>
        <CardActions>
          <Button variant="ghost" size="sm" onClick={() => onAddAnother(category.id)}>
            + Another
          </Button>
        </CardActions>
      </CardSectionHeader>
      {responses.map(response => (
        <PromptField
          key={response.clientId}
          response={response}
          onUpdate={onUpdate}
          onChangePrompt={onChangePrompt}
          onRemove={onRemove}
        />
      ))}
    </CardSection>
  );
}

// ── JournalTab ────────────────────────────────────────────────────────────────

export function JournalTab({ mode, categories, responses, setResponses, onSave, saveState }: Readonly<Props>) {

  // Which category IDs are currently active (have prompts)
  const activeCategoryIds = new Set(responses.map(r => r.categoryId));

  const toggleCategory = (cat: JournalCategoryWithPrompts) => {
    if (activeCategoryIds.has(cat.id)) {
      // Deactivate — remove all prompts for this category
      setResponses(prev => prev.filter(r => r.categoryId !== cat.id));
    } else {
      // Activate — add one random prompt
      const existingPromptIds = new Set(responses
        .filter(r => r.categoryId === cat.id)
        .map(r => r.promptId));
      const prompt = pickRandom(cat.prompts, cat.prompts.filter(p => existingPromptIds.has(p.id)));
      if (!prompt) return;
      setResponses(prev => [...prev, {
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
    const usedPromptIds = new Set(responses.filter(r => r.categoryId === categoryId).map(r => r.promptId));
    const unusedPrompts = cat.prompts.filter(p => !usedPromptIds.has(p.id));
    const pool          = unusedPrompts.length ? unusedPrompts : cat.prompts;
    if (!pool.length) return;
    const prompt = pickRandom(pool);
    if (!prompt) return;
    setResponses(prev => [...prev, {
      clientId:    nextId(),
      categoryId,
      promptId:    prompt.id,
      promptText:  prompt.prompt_text,
      responseText: '',
      dbId:        null,
    }]);
  };

  const updateResponse = (clientId: string, text: string) => {
    setResponses(prev => prev.map(r => r.clientId === clientId ? { ...r, responseText: text } : r));
  };

  const changePrompt = (clientId: string) => {
    const response = responses.find(r => r.clientId === clientId);
    if (!response) return;
    const cat = categories.find(c => c.id === response.categoryId);
    if (!cat) return;
    const usedIds = new Set(responses
      .filter(r => r.categoryId === response.categoryId && r.clientId !== clientId)
      .map(r => r.promptId));
    const pool = cat.prompts.filter(p => !usedIds.has(p.id));
    const next = pickRandom(pool.length ? pool : cat.prompts);
    if (!next) return;
    // A new prompt is a new response: dropping dbId lets the next save delete
    // the old row and insert one for this prompt.
    setResponses(prev => prev.map(r =>
      r.clientId !== clientId ? r : { ...r, promptId: next.id, promptText: next.prompt_text, responseText: '', dbId: null }
    ));
  };

  const removePrompt = (clientId: string) => {
    setResponses(prev => prev.filter(r => r.clientId !== clientId));
  };

  // ── View mode ───────────────────────────────────────────────────────────────

  if (mode === 'view') {
    if (responses.length === 0) {
      return <EmptyState>No journal entries for this day.</EmptyState>;
    }

    // Group by category
    const grouped = new Map<string, JournalPromptResponse[]>();
    for (const response of responses) {
      const cat = categories.find(c => c.id === response.categoryId);
      const key = cat?.category_name ?? 'Other';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(response);
    }

    return (
      <>
        {[...grouped.entries()].map(([catName, catResponses]) => (
          <CardSection key={catName}>
            <CardSectionLabel>{catName}</CardSectionLabel>
            {catResponses.filter(r => r.responseText.trim()).map(r => (
              <Field key={r.clientId} label={r.promptText} value={r.responseText} />
            ))}
          </CardSection>
        ))}
      </>
    );
  }

  // ── Input mode ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Category chips */}
      <InputField label="What do you feel like exploring today?">
        <ChipSelect
          label="Journal categories"
          options={categories.map(cat => ({ value: cat.id, label: cat.category_name, disabled: cat.prompts.length === 0 }))}
          selected={[...activeCategoryIds]}
          onToggle={id => { const cat = categories.find(c => c.id === id); if (cat) toggleCategory(cat); }}
        />
      </InputField>

      {/* Prompt sections */}
      {responses.length === 0 && (
        <EmptyState className="journal-category-chips__empty">
          Toggle some categories above to get started.
        </EmptyState>
      )}

      {categories
        .filter(cat => activeCategoryIds.has(cat.id))
        .map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            responses={responses.filter(r => r.categoryId === cat.id)}
            onUpdate={updateResponse}
            onChangePrompt={changePrompt}
            onRemove={removePrompt}
            onAddAnother={addAnother}
          />
        ))}

      {/* Tab-level save */}
      <div className="journal-save-row">
        <Button variant="secondary" size="sm" onClick={onSave} busy={saveState === 'saving'}>
          💾 Save journal
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </div>
  );
}
