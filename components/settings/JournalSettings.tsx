'use client';

import { createClient }      from '@/lib/supabase/client';
import { batchSetSortOrder } from '@/lib/dal/settings';
import {
  addJournalCategory,    updateJournalCategory, deleteJournalCategory, toggleJournalCategory,
  addJournalPrompt,      updateJournalPrompt,   deleteJournalPrompt,   toggleJournalPrompt,
} from '@/lib/dal/journal';
import {
  addWeeklyJournalCategory,    updateWeeklyJournalCategory,
  deleteWeeklyJournalCategory, toggleWeeklyJournalCategory,
  addWeeklyJournalPrompt,      updateWeeklyJournalPrompt,
  deleteWeeklyJournalPrompt,   toggleWeeklyJournalPrompt,
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

// ── Shared prompt-list config ─────────────────────────────────────────────────

const PROMPT_LIST_CONFIG = {
  childInputType:   'textarea'   as const,
  childItalic:      true,
  childPlaceholder: 'New prompt…',
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
          deleteCategory:    id                     => deleteJournalCategory(supabase, id),
          toggleCategory:    (id, active)           => toggleJournalCategory(supabase, id, active),
          reorderCategories: updates                => batchSetSortOrder(supabase, 'journal_categories', updates),
          addChild:          (catId, text, _sort)   => addJournalPrompt(supabase, catId, text),
          updateChild:       (id, text)             => updateJournalPrompt(supabase, id, text),
          deleteChild:       id                     => deleteJournalPrompt(supabase, id),
          toggleChild:       (id, active)           => toggleJournalPrompt(supabase, id, active),
          reorderChildren:   updates                => batchSetSortOrder(supabase, 'journal_prompts', updates),
        }}
      />
      <div className="settings-section-gap" />
      <HierarchicalList
        title="Weekly Journal Prompts"
        description="Prompts for the weekly journal, organised by category."
        initialCategories={normaliseWeekly(initialWeekly)}
        {...PROMPT_LIST_CONFIG}
        dal={{
          addCategory:       (name, sort)          => addWeeklyJournalCategory(supabase, name, sort),
          updateCategory:    (id, name)             => updateWeeklyJournalCategory(supabase, id, name),
          deleteCategory:    id                     => deleteWeeklyJournalCategory(supabase, id),
          toggleCategory:    (id, active)           => toggleWeeklyJournalCategory(supabase, id, active),
          reorderCategories: updates                => batchSetSortOrder(supabase, 'weekly_journal_categories', updates),
          addChild:          (catId, text, _sort)   => addWeeklyJournalPrompt(supabase, catId, text),
          updateChild:       (id, text)             => updateWeeklyJournalPrompt(supabase, id, text),
          deleteChild:       id                     => deleteWeeklyJournalPrompt(supabase, id),
          toggleChild:       (id, active)           => toggleWeeklyJournalPrompt(supabase, id, active),
          reorderChildren:   updates                => batchSetSortOrder(supabase, 'weekly_journal_prompts', updates),
        }}
      />
    </>
  );
}