/** lib/dal/people.ts */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PersonRow,
  DiagnosisRow,
  InfoGroupRow,
  InfoFieldTypeRow,
  InfoFieldValueRow,
  ItemListRow,
  ItemListEntryRow,
  LogSchemaRow,
  LogSchemaFieldRow,
  LogSchemaFieldOptionRow,
  LogEntryRow,
  LogEntryValueRow,
  ChecklistRow,
  ChecklistItemRow,
} from "@/types/schema";
import type {
  PersonPageData,
  InfoGroupWithFields,
  ItemListWithEntries,
  LogWithSchemaAndEntries,
  LogSchemaFieldWithOptions,
  LogEntryWithValues,
  ChecklistWithItems,
} from "@/types/dal";
import { getActivePrescriptions } from "./prescriptions";

type Client = SupabaseClient;

// ── Lookups ───────────────────────────────────────────────────────────────────

export async function getAllPeople(client: Client): Promise<PersonRow[]> {
  const { data, error } = await client
    .from("people")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`getAllPeople: ${error.message}`);
  return (data ?? []) as PersonRow[];
}

/** Look up by LOWER(person_name) — e.g. 'annie', 'ender' */
export async function getPersonBySlug(
  client: Client,
  slug: string,
): Promise<PersonRow | null> {
  const { data } = await client
    .from("people")
    .select("*")
    .ilike("person_name", slug) // case-insensitive match
    .maybeSingle();
  return data as PersonRow | null;
}

// ── Full page data ────────────────────────────────────────────────────────────

export async function getPersonPageData(
  client: Client,
  person: PersonRow,
): Promise<PersonPageData> {
  const pid = person.id;

  // Fetch all junction IDs and related entity IDs in parallel
  const [
    diagnoses,
    infoGroupLinks,
    listLinks,
    logLinks,
    checklistLinks,
    prescriptions,
  ] = await Promise.all([
    client
      .from("diagnoses")
      .select("*")
      .eq("person_id", pid)
      .eq("is_active", true)
      .then((r) => (r.data ?? []) as DiagnosisRow[]),

    client
      .from("person_info_group_links")
      .select("info_group_id")
      .eq("person_id", pid)
      .then((r) =>
        (r.data ?? []).map((x: { info_group_id: number }) => x.info_group_id),
      ),

    client
      .from("person_item_list_links")
      .select("list_id")
      .eq("person_id", pid)
      .then((r) => (r.data ?? []).map((x: { list_id: number }) => x.list_id)),

    client
      .from("person_log_links")
      .select("log_id")
      .eq("person_id", pid)
      .then((r) => (r.data ?? []).map((x: { log_id: number }) => x.log_id)),

    client
      .from("person_checklist_links")
      .select("checklist_id")
      .eq("person_id", pid)
      .then((r) =>
        (r.data ?? []).map((x: { checklist_id: number }) => x.checklist_id),
      ),

    getActivePrescriptions(client, pid),
  ]);

  // ── Info groups ──────────────────────────────────────────────────────────────

  let infoGroups: InfoGroupWithFields[] = [];

  if (infoGroupLinks.length > 0) {
    const [groups, allFields] = await Promise.all([
      client
        .from("info_groups")
        .select("*")
        .in("id", infoGroupLinks)
        .eq("is_active", true)
        .order("sort_order")
        .then((r) => (r.data ?? []) as InfoGroupRow[]),
      client
        .from("info_field_types")
        .select("*")
        .in("group_id", infoGroupLinks)
        .eq("is_active", true)
        .order("sort_order")
        .then((r) => (r.data ?? []) as InfoFieldTypeRow[]),
    ]);

    const fieldIds = allFields.map((f) => f.id);
    const values =
      fieldIds.length > 0
        ? await client
            .from("info_field_values")
            .select("*")
            .in("field_type_id", fieldIds)
            .eq("person_id", pid)
            .then((r) => (r.data ?? []) as InfoFieldValueRow[])
        : [];

    const valueMap = new Map(values.map((v) => [v.field_type_id, v]));

    infoGroups = groups.map((g) => ({
      ...g,
      fields: allFields
        .filter((f) => f.group_id === g.id)
        .map((f) => {
          const val = valueMap.get(f.id);
          return {
            ...f,
            value: val?.field_value ?? null,
            value_id: val?.id ?? null,
          };
        }),
    }));
  }

  // ── Item lists ────────────────────────────────────────────────────────────────

  let itemLists: ItemListWithEntries[] = [];

  if (listLinks.length > 0) {
    const [lists, entries] = await Promise.all([
      client
        .from("item_lists")
        .select("*")
        .in("id", listLinks)
        .eq("is_active", true)
        .order("sort_order")
        .then((r) => (r.data ?? []) as ItemListRow[]),
      client
        .from("item_list_entries")
        .select("*")
        .in("list_id", listLinks)
        .eq("person_id", pid)
        .order("entry_date", { ascending: false })
        .then((r) => (r.data ?? []) as ItemListEntryRow[]),
    ]);

    itemLists = lists.map((l) => ({
      ...l,
      entries: entries.filter((e) => e.list_id === l.id),
    }));
  }

  // ── Logs ──────────────────────────────────────────────────────────────────────

  let logs: LogWithSchemaAndEntries[] = [];

  if (logLinks.length > 0) {
    const [schemas, fields, allOptions, entries] = await Promise.all([
      client
        .from("log_schemas")
        .select("*")
        .in("id", logLinks)
        .eq("is_active", true)
        .order("sort_order")
        .then((r) => (r.data ?? []) as LogSchemaRow[]),
      client
        .from("log_schema_fields")
        .select("*")
        .in("log_id", logLinks)
        .eq("is_active", true)
        .order("sort_order")
        .then((r) => (r.data ?? []) as LogSchemaFieldRow[]),
      client
        .from("log_schema_field_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .then((r) => (r.data ?? []) as LogSchemaFieldOptionRow[]),
      client
        .from("log_entries")
        .select("*")
        .in("log_id", logLinks)
        .eq("person_id", pid)
        .order("entry_date", { ascending: false })
        .limit(100)
        .then((r) => (r.data ?? []) as LogEntryRow[]),
    ]);

    const entryIds = entries.map((e) => e.id);
    const entryValues =
      entryIds.length > 0
        ? await client
            .from("log_entry_values")
            .select("*")
            .in("log_entry_id", entryIds)
            .then((r) => (r.data ?? []) as LogEntryValueRow[])
        : [];

    // Group entry values by entry id
    const valuesByEntry = entryValues.reduce<
      Record<number, LogEntryValueRow[]>
    >((acc, v) => {
      if (!acc[v.log_entry_id]) acc[v.log_entry_id] = [];
      acc[v.log_entry_id].push(v);
      return acc;
    }, {});

    logs = schemas.map((s) => {
      const schemaFields: LogSchemaFieldWithOptions[] = fields
        .filter((f) => f.log_id === s.id)
        .map((f) => ({
          ...f,
          options: allOptions.filter((o) => o.field_id === f.id),
        }));

      const logEntries: LogEntryWithValues[] = entries
        .filter((e) => e.log_id === s.id)
        .map((e) => ({
          ...e,
          values: (valuesByEntry[e.id] ?? []).reduce<Record<number, string>>(
            (acc, v) => {
              acc[v.field_id] = v.field_value ?? "";
              return acc;
            },
            {},
          ),
        }));

      return { ...s, fields: schemaFields, entries: logEntries };
    });
  }

  // ── Checklists ────────────────────────────────────────────────────────────────

  let checklists: ChecklistWithItems[] = [];

  if (checklistLinks.length > 0) {
    const [lists, items] = await Promise.all([
      client
        .from("checklists")
        .select("*")
        .in("id", checklistLinks)
        .eq("is_active", true)
        .order("sort_order")
        .then((r) => (r.data ?? []) as ChecklistRow[]),
      client
        .from("checklist_items")
        .select("*")
        .in("checklist_id", checklistLinks)
        .order("sort_order")
        .then((r) => (r.data ?? []) as ChecklistItemRow[]),
    ]);

    const itemIds = items.map((i) => i.id);
    const states =
      itemIds.length > 0
        ? await client
            .from("checklist_item_states")
            .select("item_id, is_checked")
            .in("item_id", itemIds)
            .eq("person_id", pid)
            .then(
              (r) =>
                (r.data ?? []) as { item_id: number; is_checked: boolean }[],
            )
        : [];
    const stateMap = new Map(states.map((s) => [s.item_id, s.is_checked]));

    checklists = lists.map((l) => ({
      ...l,
      items: items
        .filter((i) => i.checklist_id === l.id)
        .map((i) => ({
          ...i,
          is_checked: stateMap.has(i.id) ? stateMap.get(i.id)! : i.is_checked,
        })),
    }));
  }

  return {
    person,
    diagnoses,
    infoGroups,
    itemLists,
    logs,
    checklists,
    prescriptions,
  };
}

// ── Writes ────────────────────────────────────────────────────────────────────

/** Upsert a single info field value for a specific person */
export async function saveInfoFieldValue(
  client: Client,
  fieldTypeId: number,
  value: string,
  existingValueId: number | null,
  personId: number,
): Promise<void> {
  if (existingValueId) {
    await client
      .from("info_field_values")
      .update({ field_value: value })
      .eq("id", existingValueId)
      .throwOnError();
  } else {
    await client
      .from("info_field_values")
      .upsert(
        { field_type_id: fieldTypeId, field_value: value, person_id: personId },
        { onConflict: "field_type_id,person_id" },
      )
      .throwOnError();
  }
}

/** Toggle a checklist item's checked state for a specific person */
export async function toggleChecklistItemState(
  client: Client,
  itemId: number,
  personId: number,
  checked: boolean,
): Promise<void> {
  await client
    .from("checklist_item_states")
    .upsert(
      { item_id: itemId, person_id: personId, is_checked: checked },
      { onConflict: "item_id,person_id" },
    )
    .throwOnError();
}

export async function addItemListEntry(
  client: Client,
  listId: number,
  text: string,
  date: string,
  personId: number,
): Promise<ItemListEntryRow> {
  const { data, error } = await client
    .from("item_list_entries")
    .insert({
      list_id: listId,
      entry_text: text,
      entry_date: date,
      person_id: personId,
    })
    .select()
    .single();
  if (error) throw new Error(`addItemListEntry: ${error.message}`);
  return data as ItemListEntryRow;
}

export async function deleteItemListEntry(
  client: Client,
  id: number,
): Promise<void> {
  await client.from("item_list_entries").delete().eq("id", id).throwOnError();
}

export async function addLogEntry(
  client: Client,
  logId: number,
  entryDate: string,
  values: Record<number, string>,
  personId: number,
): Promise<LogEntryWithValues> {
  const { data: entry, error } = await client
    .from("log_entries")
    .insert({ log_id: logId, entry_date: entryDate, person_id: personId })
    .select()
    .single();
  if (error) throw new Error(`addLogEntry: ${error.message}`);

  const fieldEntries = Object.entries(values).map(([fieldId, val]) => ({
    log_entry_id: entry.id,
    field_id: Number.parseInt(fieldId),
    field_value: val,
  }));

  if (fieldEntries.length > 0) {
    await client.from("log_entry_values").insert(fieldEntries).throwOnError();
  }

  return {
    ...(entry as LogEntryRow),
    values,
  };
}

export async function deleteLogEntry(
  client: Client,
  id: number,
): Promise<void> {
  await client.from("log_entries").delete().eq("id", id).throwOnError();
}
