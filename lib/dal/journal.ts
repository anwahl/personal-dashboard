/**
 * lib/dal/journal.ts
 *
 * Journal prompt responses for daily entries.
 * Categories + prompts are fetched via getReferenceData → reference.journalCategories.
 */

import type { JournalCategoryRow, JournalPromptRow } from "@/types/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

// ── Types ─────────────────────────────────────────────────────────────────────

/** An existing journal_prompt_response row, enriched with its prompt + category. */
export interface JournalResponseDetail {
  id: number;
  prompt_id: number;
  prompt_text: string;
  category_id: number;
  category_name: string;
  response_text: string | null;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * All journal responses for a daily entry, joined with prompt + category.
 */
export async function getJournalResponsesForEntry(
  client: Client,
  entryId: number,
): Promise<JournalResponseDetail[]> {
  const { data, error } = await client
    .from("journal_prompt_responses")
    .select(
      `
      id,
      prompt_id,
      response_text,
      journal_prompts!inner (
        prompt_text,
        category_id,
        journal_categories!inner (
          category_name
        )
      )
    `,
    )
    .eq("entry_id", entryId);

  if (error) throw new Error(`getJournalResponsesForEntry: ${error.message}`);

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    prompt_id: r.prompt_id,
    prompt_text: r.journal_prompts.prompt_text,
    category_id: r.journal_prompts.category_id,
    category_name: r.journal_prompts.journal_categories.category_name,
    response_text: r.response_text,
  }));
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Full sync of journal prompt responses for a daily entry:
 * - Upserts responses with text (insert if new, update if existing)
 * - Deletes existing DB rows whose responses were removed
 * - Ignores responses with empty text (won't create empty rows)
 *
 * Returns each response's row id after the save, in input order
 * (null where nothing is stored).
 */
export async function saveJournalResponses(
  client: Client,
  entryId: number,
  responses: Array<{
    promptId: number;
    responseText: string;
    dbId: number | null;
  }>,
): Promise<(number | null)[]> {
  // Get all currently-saved response IDs for this entry
  const { data: existing } = await client
    .from("journal_prompt_responses")
    .select("id")
    .eq("entry_id", entryId);

  const existingIds = new Set(
    ((existing ?? []) as { id: number }[]).map((r) => r.id),
  );
  const activeDbIds = new Set(
    responses.filter((r) => r.dbId != null).map((r) => r.dbId!),
  );

  // Delete rows that are no longer in our response list
  const toDelete = [...existingIds].filter((id) => !activeDbIds.has(id));
  if (toDelete.length) {
    await client.from("journal_prompt_responses").delete().in("id", toDelete);
  }

  // Upsert each response
  const savedIds: (number | null)[] = [];
  for (const response of responses) {
    const text = response.responseText.trim();

    if (response.dbId) {
      if (text) {
        // Update existing row
        await client
          .from("journal_prompt_responses")
          .update({ response_text: text })
          .eq("id", response.dbId);
        savedIds.push(response.dbId);
      } else {
        // Text cleared → delete the row
        await client
          .from("journal_prompt_responses")
          .delete()
          .eq("id", response.dbId);
        savedIds.push(null);
      }
    } else if (text) {
      // New response with text → insert
      const { data, error } = await client
        .from("journal_prompt_responses")
        .insert({
          prompt_id: response.promptId,
          entry_id: entryId,
          response_text: text,
        })
        .select("id")
        .single();
      if (error) throw error;
      savedIds.push((data as { id: number }).id);
    } else {
      // No dbId and no text: skip (don't create empty rows)
      savedIds.push(null);
    }
  }
  return savedIds;
}

// ── Settings operations ───────────────────────────────────────────────────────

export async function addJournalCategory(
  client: Client,
  name: string,
  sortOrder: number,
): Promise<JournalCategoryRow> {
  const { data, error } = await client
    .from("journal_categories")
    .insert({ category_name: name.trim(), sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(`addJournalCategory: ${error.message}`);
  return data as JournalCategoryRow;
}

export async function toggleJournalCategory(
  client: Client,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from("journal_categories")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`toggleJournalCategory: ${error.message}`);
}

export async function addJournalPrompt(
  client: Client,
  categoryId: number,
  promptText: string,
): Promise<JournalPromptRow> {
  const { data, error } = await client
    .from("journal_prompts")
    .insert({ category_id: categoryId, prompt_text: promptText })
    .select()
    .single();
  if (error) throw new Error(`addJournalPrompt: ${error.message}`);
  return data as JournalPromptRow;
}

export async function toggleJournalPrompt(
  client: Client,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from("journal_prompts")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`toggleJournalPrompt: ${error.message}`);
}

export async function updateJournalCategory(
  client: Client,
  id: number,
  name: string,
): Promise<void> {
  const { error } = await client
    .from("journal_categories")
    .update({ category_name: name.trim() })
    .eq("id", id);
  if (error) throw new Error(`updateJournalCategory: ${error.message}`);
}

export async function updateJournalPrompt(
  client: Client,
  id: number,
  text: string,
): Promise<void> {
  const { error } = await client
    .from("journal_prompts")
    .update({ prompt_text: text.trim() })
    .eq("id", id);
  if (error) throw new Error(`updateJournalPrompt: ${error.message}`);
}
