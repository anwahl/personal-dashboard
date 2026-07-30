'use client';

/**
 * WeeklyJournalClient
 *
 * Prompt-card based weekly journal entry, mirroring the daily JournalTab pattern.
 * Each active prompt from the categories shows as a card the user can write in.
 * Single Save button persists all responses at once.
 */

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import {
  createWeeklyEntry,
  saveWeeklyResponses,
} from '@/lib/dal/weekly-journal';
import { addDays, getSundayOfWeek }  from '@/lib/utils/dates';
import { Button, SaveStatus }        from '@/components/ui';
import type { SaveState }            from '@/components/ui';
import type { WeeklyEntryRow }       from '@/types/schema';
import type {
  WeeklyJournalCategoryWithPrompts,
  WeeklyJournalResponseDetail,
} from '@/types/dal';

interface Card {
  key:          string;       // unique per rendered card
  promptId:     number;
  promptText:   string;
  categoryId:   number;
  responseText: string;
  dbId:         number | null;
}

interface Props {
  weekStart:     string;
  weekNum:       number;
  weekRange:     string;
  existingEntry: WeeklyEntryRow | null;
  categories:    WeeklyJournalCategoryWithPrompts[];
  responses:     WeeklyJournalResponseDetail[];
}

function buildInitialCards(
  categories: WeeklyJournalCategoryWithPrompts[],
  responses:  WeeklyJournalResponseDetail[],
): Card[] {
  const responseByPromptId = new Map(responses.map(r => [r.prompt_id, r]));
  const cards: Card[] = [];

  for (const cat of categories) {
    for (const prompt of cat.prompts) {
      const existing = responseByPromptId.get(prompt.id);
      if (existing || true) {
        // Show all active prompts by default; those with responses pre-filled
        cards.push({
          key:          `p-${prompt.id}`,
          promptId:     prompt.id,
          promptText:   prompt.prompt_text,
          categoryId:   cat.id,
          responseText: existing?.response_text ?? '',
          dbId:         existing?.id ?? null,
        });
      }
    }
  }
  return cards;
}

// ── Week navigation helper ────────────────────────────────────────────────────

function prevSunday(weekStart: string): string {
  return getSundayOfWeek(addDays(weekStart, -1));
}
function nextSunday(weekStart: string): string {
  return getSundayOfWeek(addDays(weekStart, 7));
}

// ── Main component ────────────────────────────────────────────────────────────

export function WeeklyJournalClient({
  weekStart, weekNum, weekRange,
  existingEntry, categories, responses,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  const [entryId,    setEntryId]    = useState<number | null>(existingEntry?.id ?? null);
  const [cards,      setCards]      = useState<Card[]>(() => buildInitialCards(categories, responses));
  const [saveState,  setSaveState]  = useState<SaveState>('idle');
  const [mode,       setMode]       = useState<'view' | 'edit'>(
    existingEntry ? 'view' : 'edit'
  );

  const hasContent = cards.some(c => c.responseText.trim());

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = useCallback(async () => {
    if (!hasContent) return;
    setSaveState('saving');
    try {
      let eid = entryId;
      if (!eid) {
        const entry = await createWeeklyEntry(supabase, weekStart);
        eid = entry.id;
        setEntryId(eid);
      }
      await saveWeeklyResponses(supabase, eid, cards.map(c => ({
        promptId:     c.promptId,
        responseText: c.responseText,
        dbId:         c.dbId,
      })));
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      setMode('view');
      router.refresh();
    } catch {
      setSaveState('error');
    }
  }, [supabase, weekStart, entryId, cards, hasContent, router]);

  const updateCard = (key: string, text: string) =>
    setCards(prev => prev.map(c => c.key === key ? { ...c, responseText: text } : c));

  // ── View mode ─────────────────────────────────────────────────────────────

  if (mode === 'view') {
    const filled = cards.filter(c => c.responseText.trim());
    if (filled.length === 0) {
      return (
        <div>
          <WeekNav weekStart={weekStart} weekNum={weekNum} weekRange={weekRange} />
          <p className="empty-state">No responses yet for this week.</p>
          <Button variant="accent" onClick={() => setMode('edit')}>Write Entry</Button>
        </div>
      );
    }

    // Group by category for view
    const byCategory: Record<number, { catName: string; cards: Card[] }> = {};
    for (const card of filled) {
      const cat = categories.find(c => c.id === card.categoryId);
      if (!byCategory[card.categoryId]) {
        byCategory[card.categoryId] = { catName: cat?.category_name ?? '', cards: [] };
      }
      byCategory[card.categoryId].cards.push(card);
    }

    return (
      <div>
        <WeekNav weekStart={weekStart} weekNum={weekNum} weekRange={weekRange} />
        <div className="page-actions">
          <Button variant="ghost" onClick={() => setMode('edit')}>✏️ Edit</Button>
        </div>
        {Object.values(byCategory).map(({ catName, cards: catCards }) => (
          <div key={catName} className="journal-category-section">
            <p className="card__section-label">{catName}</p>
            {catCards.map(card => (
              <div key={card.key} className="journal-prompt-card journal-prompt-card--view">
                <p className="journal-prompt-card__prompt">{card.promptText}</p>
                <p className="journal-prompt-card__response">{card.responseText}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────

  // Group cards by category for edit
  const cardsByCategory: Record<number, { catName: string; cards: Card[] }> = {};
  for (const card of cards) {
    const cat = categories.find(c => c.id === card.categoryId);
    if (!cardsByCategory[card.categoryId]) {
      cardsByCategory[card.categoryId] = { catName: cat?.category_name ?? '', cards: [] };
    }
    cardsByCategory[card.categoryId].cards.push(card);
  }

  return (
    <div>
      <WeekNav weekStart={weekStart} weekNum={weekNum} weekRange={weekRange} />

      {Object.values(cardsByCategory).map(({ catName, cards: catCards }) => (
        <div key={catName} className="journal-category-section">
          <p className="card__section-label">{catName}</p>
          {catCards.map(card => (
            <div key={card.key} className="journal-prompt-card">
              <p className="journal-prompt-card__prompt">{card.promptText}</p>
              <textarea
                className="journal-prompt-card__textarea"
                value={card.responseText}
                onChange={e => updateCard(card.key, e.target.value)}
                placeholder="Write your response…"
                rows={3}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="page-actions">
        <Button variant="accent" onClick={save} disabled={saveState === 'saving' || !hasContent}>
          {saveState === 'saving' ? 'Saving…' : 'Save Entry'}
        </Button>
        {existingEntry && (
          <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
        )}
        <SaveStatus state={saveState} />
      </div>
    </div>
  );
}

// ── Week navigation bar ───────────────────────────────────────────────────────

function WeekNav({ weekStart, weekNum, weekRange }: Readonly<{
  weekStart: string; weekNum: number; weekRange: string;
}>) {
  const router = useRouter();
  const prev = prevSunday(weekStart);
  const next = nextSunday(weekStart);

  return (
    <div className="week-nav">
      <button type="button" className="week-nav__btn" onClick={() => router.push(`/journal/weekly/${prev}`)}>‹</button>
      <span className="week-nav__label">Week {weekNum} · {weekRange}</span>
      <button type="button" className="week-nav__btn" onClick={() => router.push(`/journal/weekly/${next}`)}>›</button>
    </div>
  );
}
