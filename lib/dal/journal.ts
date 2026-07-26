/**
 * lib/dal/journal.ts
 *
 * Journal prompt responses for daily entries.
 * Categories + prompts are fetched via getReferenceData → reference.journalCategories.
 */

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
 * Full sync of journal cards for a daily entry:
 * - Upserts cards with text (insert if new, update if existing)
 * - Deletes existing DB rows whose cards were removed
 * - Ignores cards with empty text (won't create empty rows)
 */
export async function saveJournalResponses(
  client: Client,
  entryId: number,
  cards: Array<{
    promptId: number;
    responseText: string;
    dbId: number | null;
  }>,
): Promise<void> {
  // Get all currently-saved response IDs for this entry
  const { data: existing } = await client
    .from("journal_prompt_responses")
    .select("id")
    .eq("entry_id", entryId);

  const existingIds = new Set(
    ((existing ?? []) as { id: number }[]).map((r) => r.id),
  );
  const activeDbIds = new Set(
    cards.filter((c) => c.dbId != null).map((c) => c.dbId!),
  );

  // Delete rows that are no longer in our card list
  const toDelete = [...existingIds].filter((id) => !activeDbIds.has(id));
  if (toDelete.length) {
    await client.from("journal_prompt_responses").delete().in("id", toDelete);
  }

  // Upsert each card
  for (const card of cards) {
    const text = card.responseText.trim();

    if (card.dbId) {
      if (text) {
        // Update existing row
        await client
          .from("journal_prompt_responses")
          .update({ response_text: text })
          .eq("id", card.dbId);
      } else {
        // Text cleared → delete the row
        await client
          .from("journal_prompt_responses")
          .delete()
          .eq("id", card.dbId);
      }
    } else if (text) {
      // New card with text → insert
      await client.from("journal_prompt_responses").insert({
        prompt_id: card.promptId,
        entry_id: entryId,
        response_text: text,
      });
    }
    // Cards without dbId and without text: skip (don't create empty rows)
  }
}

export async function deleteJournalResponse(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client
    .from("journal_prompt_responses")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteJournalResponse: ${error.message}`);
}
