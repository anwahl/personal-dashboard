'use client';

import { createClient }      from '@/lib/supabase/client';
import { batchSetSortOrder, setItemCategory } from '@/lib/dal/settings';
import {
  addJournalCategory,    updateJournalCategory, toggleJournalCategory,
  addJournalPrompt,      updateJournalPrompt,   toggleJournalPrompt,
} from '@/lib/dal/journal';
import {
  addWeeklyJournalCategory,    updateWeeklyJournalCategory,
  toggleWeeklyJournalCategory,
  addWeeklyJournalPrompt,      updateWeeklyJournalPrompt,
  toggleWeeklyJournalPrompt,
} from '@/lib/dal/weekly-journal';
import { HierarchicalList }  from '@/components/settings/HierarchicalList';
import type { JournalCategoryWithPrompts, WeeklyJournalCategoryWithPrompts } from '@/types/dal';

// ── Normalisation helpers ─────────────────────────────────────────────────────

function normaliseJournal(cats: JournalCategoryWithPrompts[]) {
  return cats.map(c => ({
    id: c.id, name: c.category_name, is_active: c.is_active, sort_order: c.sort_order ?? 0,
    children: c.prompts.map(p => ({
      id: p.id, name: p.prompt_text, is_active: p.is_active, sort_order: p.sort_order ?? 0,
    })),
  }));
}

function normaliseWeekly(cats: WeeklyJournalCategoryWithPrompts[]) {
  return cats.map(c => ({
    id: c.id, name: c.category_name, is_active: c.is_active, sort_order: c.sort_order ?? 0,
    children: c.prompts.map(p => ({
      id: p.id, name: p.prompt_text, is_active: p.is_active, sort_order: p.sort_order ?? 0,
    })),
  }));
}

// Prompts always have a category (no Uncategorized group), so addChild's catId is set.

// ── Shared prompt-list config ─────────────────────────────────────────────────

const PROMPT_LIST_CONFIG = {
  childInputType:   'textarea'   as const,
  childItalic:      true,
  childPlaceholder: 'New prompt…',
  childrenSortable: false,   // prompts are picked at random, so their order doesn't matter
  catPlaceholder:   'New category…',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  categories:       JournalCategoryWithPrompts[];
  weeklyCategories: WeeklyJournalCategoryWithPrompts[];
}

export function JournalSettings({ categories: initial, weeklyCategories: initialWeekly }: Readonly<Props>) {
  const supabase = createClient();

  return (
    <>
      <HierarchicalList
        title="Journal Prompts"
        description="Prompts are randomly selected when creating journal entries."
        initialCategories={normaliseJournal(initial)}
        {...PROMPT_LIST_CONFIG}
        dal={{
          addCategory:       (name, sort)          => addJournalCategory(supabase, name, sort),
          updateCategory:    (id, name)             => updateJournalCategory(supabase, id, name),
          toggleCategory:    (id, active)           => toggleJournalCategory(supabase, id, active),
          reorderCategories: updates                => batchSetSortOrder(supabase, 'journal_categories', updates),
          addChild:          (catId, v)             => addJournalPrompt(supabase, catId!, String(v.name)),
          updateChild:       (id, v)                => updateJournalPrompt(supabase, id, String(v.name)),
          toggleChild:       (id, active)           => toggleJournalPrompt(supabase, id, active),
          reorderChildren:   updates                => batchSetSortOrder(supabase, 'journal_prompts', updates),
          moveChild:         (id, catId)            => setItemCategory(supabase, 'journal_prompts', id, catId),
        }}
      />
      <HierarchicalList
        title="Weekly Journal Prompts"
        description="Prompts for the weekly journal, organised by category."
        initialCategories={normaliseWeekly(initialWeekly)}
        {...PROMPT_LIST_CONFIG}
        dal={{
          addCategory:       (name, sort)          => addWeeklyJournalCategory(supabase, name, sort),
          updateCategory:    (id, name)             => updateWeeklyJournalCategory(supabase, id, name),
          toggleCategory:    (id, active)           => toggleWeeklyJournalCategory(supabase, id, active),
          reorderCategories: updates                => batchSetSortOrder(supabase, 'weekly_journal_categories', updates),
          addChild:          (catId, v)             => addWeeklyJournalPrompt(supabase, catId!, String(v.name)),
          updateChild:       (id, v)                => updateWeeklyJournalPrompt(supabase, id, String(v.name)),
          toggleChild:       (id, active)           => toggleWeeklyJournalPrompt(supabase, id, active),
          reorderChildren:   updates                => batchSetSortOrder(supabase, 'weekly_journal_prompts', updates),
          moveChild:         (id, catId)            => setItemCategory(supabase, 'weekly_journal_prompts', id, catId),
        }}
      />
    </>
  );
}