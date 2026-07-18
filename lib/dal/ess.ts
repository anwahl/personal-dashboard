/**
 * lib/dal/ess.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EssEntryRow, EssQuestionResponseRow } from '@/types/schema';
import type { EssEntryDetail } from '@/types/dal';

type Client = SupabaseClient;

export async function getEssEntry(
  client: Client,
  entryId: number
): Promise<EssEntryDetail | null> {
  const { data: row, error } = await client
    .from('ess_entries')
    .select('*')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (error) throw new Error(`getEssEntry: ${error.message}`);
  if (!row) return null;

  const [{ data: responses }, { data: totalRow }] = await Promise.all([
    client
      .from('ess_question_responses')
      .select('*')
      .eq('ess_entry_id', row.id),
    client
      .from('ess_entry_totals')
      .select('total')
      .eq('ess_entry_id', row.id)
      .maybeSingle(),
  ]);

  return {
    ...(row as EssEntryRow),
    responses: (responses ?? []) as EssQuestionResponseRow[],
    total:     (totalRow as { total: number } | null)?.total ?? 0,
  };
}

/** Gets or creates the ess_entries row for an entry. */
export async function ensureEssEntry(
  client: Client,
  entryId: number
): Promise<EssEntryRow> {
  const { data: existing } = await client
    .from('ess_entries')
    .select('*')
    .eq('entry_id', entryId)
    .maybeSingle();

  if (existing) return existing as EssEntryRow;

  const { data, error } = await client
    .from('ess_entries')
    .insert({ entry_id: entryId })
    .select()
    .single();

  if (error) throw new Error(`ensureEssEntry: ${error.message}`);
  return data as EssEntryRow;
}

/** Upsert a single question response. Ensures ess_entries row exists first. */
export async function setEssResponse(
  client: Client,
  entryId:        number,
  questionTypeId: number,
  answerTypeId:   number
): Promise<void> {
  const essEntry = await ensureEssEntry(client, entryId);

  await client
    .from('ess_question_responses')
    .upsert({
      ess_entry_id:     essEntry.id,
      question_type_id: questionTypeId,
      answer_type_id:   answerTypeId,
    }, { onConflict: 'ess_entry_id,question_type_id' })
    .throwOnError();
}

/** Replace all responses for an ESS entry in a single batch. */
export async function setAllEssResponses(
  client: Client,
  entryId:   number,
  responses: { question_type_id: number; answer_type_id: number }[]
): Promise<void> {
  const essEntry = await ensureEssEntry(client, entryId);

  await client
    .from('ess_question_responses')
    .delete()
    .eq('ess_entry_id', essEntry.id)
    .throwOnError();

  if (responses.length === 0) return;

  await client
    .from('ess_question_responses')
    .insert(responses.map(r => ({ ess_entry_id: essEntry.id, ...r })))
    .throwOnError();
}
