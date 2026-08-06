/**
 * lib/dal/weekly-journal.ts
 *
 * Read/write for weekly journal entries, categories, prompts, and responses.
 * Week identification uses the Sunday YYYY-MM-DD as the canonical key
 * (stored as week_start_date on weekly_entries).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  WeeklyEntryRow,
  WeeklyJournalCategoryRow,
  WeeklyJournalPromptRow,
} from '@/types/schema';
import type {
  WeeklyJournalCategoryWithPrompts,
  WeeklyJournalResponseDetail,
} from '@/types/dal';
import { addDays } from '@/lib/utils/dates';

type Client = SupabaseClient;

// ── Weekly entry ──────────────────────────────────────────────────────────────

/** Fetch the weekly entry for a given Sunday, or null if none exists. */
export async function getWeeklyEntry(
  client:    Client,
  weekStart: string,   // YYYY-MM-DD of Sunday
): Promise<WeeklyEntryRow | null> {
  const { data, error } = await client
    .from('weekly_entries')
    .select('*')
    .eq('week_start_date', weekStart)
    .maybeSingle();
  if (error) throw new Error(`getWeeklyEntry: ${error.message}`);
  return data as WeeklyEntryRow | null;
}

/** Create a weekly entry for the given Sunday if it doesn't exist. */
export async function createWeeklyEntry(
  client:    Client,
  weekStart: string,
): Promise<WeeklyEntryRow> {
  const weekEnd = addDays(weekStart, 6); // Saturday
  const { data, error } = await client
    .from('weekly_entries')
    .insert({ week_start_date: weekStart, week_end_date: weekEnd })
    .select()
    .single();
  if (error) throw new Error(`createWeeklyEntry: ${error.message}`);
  return data as WeeklyEntryRow;
}

/** Returns the dates (week_start_date) of all entries in a given month. */
export async function getWeeklyEntryDatesForMonth(
  client: Client,
  year:   number,
  month:  number,   // 0-indexed
): Promise<string[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = `${year}-${pad(month + 1)}-01`;
  // Include any Sunday that could fall in the previous month but whose week overlaps
  const fromPad = addDays(from, -6);
  const to      = `${year}-${pad(month + 1)}-${new Date(year, month + 1, 0).getDate()}`;
  const { data, error } = await client
    .from('weekly_entries')
    .select('week_start_date')
    .gte('week_start_date', fromPad)
    .lte('week_start_date', to);
  if (error) throw new Error(`getWeeklyEntryDatesForMonth: ${error.message}`);
  return ((data ?? []) as { week_start_date: string }[]).map(r => r.week_start_date);
}

// ── Categories and prompts ────────────────────────────────────────────────────

export async function getWeeklyJournalCategories(
  client:         Client,
  includeInactive = false,
): Promise<WeeklyJournalCategoryWithPrompts[]> {
  const { data: cats, error: catErr } = await client
    .from('weekly_journal_categories')
    .select('*')
    .order('sort_order');
  if (catErr) throw new Error(`getWeeklyJournalCategories: ${catErr.message}`);

  const { data: prompts, error: promptErr } = await client
    .from('weekly_journal_prompts')
    .select('*')
    .order('sort_order');
  if (promptErr) throw new Error(`getWeeklyJournalPrompts: ${promptErr.message}`);

  return ((cats ?? []) as WeeklyJournalCategoryRow[])
    .filter(c => includeInactive || c.is_active)
    .map(c => ({
      ...c,
      prompts: ((prompts ?? []) as WeeklyJournalPromptRow[])
        .filter(p => p.category_id === c.id && (includeInactive || p.is_active)),
    }));
}

// ── Responses ─────────────────────────────────────────────────────────────────

export async function getWeeklyResponses(
  client:         Client,
  weeklyEntryId:  number,
): Promise<WeeklyJournalResponseDetail[]> {
  const { data, error } = await client
    .from('weekly_journal_prompt_responses')
    .select(`
      id,
      prompt_id,
      response_text,
      weekly_journal_prompts!inner (
        prompt_text,
        category_id,
        weekly_journal_categories!inner ( category_name )
      )
    `)
    .eq('weekly_entry_id', weeklyEntryId);
  if (error) throw new Error(`getWeeklyResponses: ${error.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(r => ({
    id:            r.id,
    prompt_id:     r.prompt_id,
    prompt_text:   r.weekly_journal_prompts.prompt_text,
    category_id:   r.weekly_journal_prompts.category_id,
    category_name: r.weekly_journal_prompts.weekly_journal_categories.category_name,
    response_text: r.response_text,
  }));
}

/**
 * Full sync of weekly journal response cards.
 * Upserts cards with text, deletes rows whose cards were removed,
 * skips cards with empty text.
 */
export async function saveWeeklyResponses(
  client:         Client,
  weeklyEntryId:  number,
  cards: Array<{ promptId: number; responseText: string; dbId: number | null }>,
): Promise<void> {
  const { data: existing } = await client
    .from('weekly_journal_prompt_responses')
    .select('id')
    .eq('weekly_entry_id', weeklyEntryId);

  const existingIds  = new Set(((existing ?? []) as { id: number }[]).map(r => r.id));
  const activeDbIds  = new Set(cards.filter(c => c.dbId != null).map(c => c.dbId!));
  const toDelete     = [...existingIds].filter(id => !activeDbIds.has(id));

  if (toDelete.length) {
    await client.from('weekly_journal_prompt_responses').delete().in('id', toDelete);
  }

  for (const card of cards) {
    const text = card.responseText.trim();
    if (card.dbId) {
      if (text) {
        await client.from('weekly_journal_prompt_responses')
          .update({ response_text: text }).eq('id', card.dbId);
      } else {
        await client.from('weekly_journal_prompt_responses')
          .delete().eq('id', card.dbId);
      }
    } else if (text) {
      await client.from('weekly_journal_prompt_responses').insert({
        weekly_entry_id: weeklyEntryId,
        prompt_id:       card.promptId,
        response_text:   text,
      });
    }
  }
}

// ── Settings: category CRUD ───────────────────────────────────────────────────

export async function addWeeklyJournalCategory(
  client: Client, name: string, sortOrder: number,
): Promise<WeeklyJournalCategoryRow> {
  const { data, error } = await client
    .from('weekly_journal_categories')
    .insert({ category_name: name.trim(), sort_order: sortOrder })
    .select().single();
  if (error) throw new Error(`addWeeklyJournalCategory: ${error.message}`);
  return data as WeeklyJournalCategoryRow;
}

export async function updateWeeklyJournalCategory(
  client: Client, id: number, name: string,
): Promise<void> {
  const { error } = await client.from('weekly_journal_categories')
    .update({ category_name: name.trim() }).eq('id', id);
  if (error) throw new Error(`updateWeeklyJournalCategory: ${error.message}`);
}

export async function toggleWeeklyJournalCategory(
  client: Client, id: number, isActive: boolean,
): Promise<void> {
  const { error } = await client.from('weekly_journal_categories')
    .update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`toggleWeeklyJournalCategory: ${error.message}`);
}

export async function deleteWeeklyJournalCategory(
  client: Client, id: number,
): Promise<void> {
  const { error } = await client.from('weekly_journal_categories').delete().eq('id', id);
  if (error) throw new Error(`deleteWeeklyJournalCategory: ${error.message}`);
}

// ── Settings: prompt CRUD ─────────────────────────────────────────────────────

export async function addWeeklyJournalPrompt(
  client: Client, categoryId: number, text: string,
): Promise<WeeklyJournalPromptRow> {
  const { data, error } = await client
    .from('weekly_journal_prompts')
    .insert({ category_id: categoryId, prompt_text: text.trim() })
    .select().single();
  if (error) throw new Error(`addWeeklyJournalPrompt: ${error.message}`);
  return data as WeeklyJournalPromptRow;
}

export async function updateWeeklyJournalPrompt(
  client: Client, id: number, text: string,
): Promise<void> {
  const { error } = await client.from('weekly_journal_prompts')
    .update({ prompt_text: text.trim() }).eq('id', id);
  if (error) throw new Error(`updateWeeklyJournalPrompt: ${error.message}`);
}

export async function toggleWeeklyJournalPrompt(
  client: Client, id: number, isActive: boolean,
): Promise<void> {
  const { error } = await client.from('weekly_journal_prompts')
    .update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`toggleWeeklyJournalPrompt: ${error.message}`);
}

export async function deleteWeeklyJournalPrompt(
  client: Client, id: number,
): Promise<void> {
  const { error } = await client.from('weekly_journal_prompts').delete().eq('id', id);
  if (error) throw new Error(`deleteWeeklyJournalPrompt: ${error.message}`);
}
