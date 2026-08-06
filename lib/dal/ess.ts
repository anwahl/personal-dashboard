/**
 * lib/dal/ess.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EssEntryRow,
  EssQuestionResponseRow,
  EssAnswerTypeRow,
} from "@/types/schema";
import type { EssEntryDetail } from "@/types/dal";

type Client = SupabaseClient;

export async function getEssEntry(
  client: Client,
  entryId: number,
): Promise<EssEntryDetail | null> {
  const { data: row, error } = await client
    .from("ess_entries")
    .select("*")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (error) throw new Error(`getEssEntry: ${error.message}`);
  if (!row) return null;

  const [{ data: responses }, { data: answerTypes }] = await Promise.all([
    client
      .from("ess_question_responses")
      .select("*")
      .eq("ess_entry_id", row.id),
    client.from("ess_answer_types").select("*"),
  ]);

  const typedResponses = (responses ?? []) as EssQuestionResponseRow[];
  const typedAnswers = (answerTypes ?? []) as EssAnswerTypeRow[];

  // Compute total locally — no longer depends on ess_entry_totals view
  const answerValueById = new Map(
    typedAnswers.map((a) => [a.id, a.answer_value]),
  );
  const total = typedResponses.reduce(
    (sum, r) => sum + (answerValueById.get(r.answer_type_id) ?? 0),
    0,
  );

  return { ...(row as EssEntryRow), responses: typedResponses, total };
}

export async function ensureEssEntry(
  client: Client,
  entryId: number,
): Promise<EssEntryRow> {
  const { data: existing } = await client
    .from("ess_entries")
    .select("*")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (existing) return existing as EssEntryRow;

  const { data, error } = await client
    .from("ess_entries")
    .insert({ entry_id: entryId })
    .select()
    .single();

  if (error) throw new Error(`ensureEssEntry: ${error.message}`);
  return data as EssEntryRow;
}

export async function setEssResponse(
  client: Client,
  entryId: number,
  questionTypeId: number,
  answerTypeId: number,
): Promise<void> {
  const essEntry = await ensureEssEntry(client, entryId);
  await client
    .from("ess_question_responses")
    .upsert(
      {
        ess_entry_id: essEntry.id,
        question_type_id: questionTypeId,
        answer_type_id: answerTypeId,
      },
      { onConflict: "ess_entry_id,question_type_id" },
    )
    .throwOnError();
}
