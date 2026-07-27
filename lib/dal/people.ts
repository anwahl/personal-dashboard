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
  // Items are per-person (person_id on checklist_items). Each person's instance
  // of a checklist has entirely independent items and checked state.

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
        .eq("person_id", pid)
        .order("sort_order")
        .then((r) => (r.data ?? []) as ChecklistItemRow[]),
    ]);

    checklists = lists.map((l) => ({
      ...l,
      items: items.filter((i) => i.checklist_id === l.id),
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
/** Toggle the checked state on a per-person checklist item. */
export async function toggleChecklistItemChecked(
  client: Client,
  itemId: number,
  checked: boolean,
): Promise<void> {
  const { error } = await client
    .from("checklist_items")
    .update({ is_checked: checked })
    .eq("id", itemId);
  if (error) throw new Error(`toggleChecklistItemChecked: ${error.message}`);
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

// ── Checklist item management ─────────────────────────────────────────────────

export async function createChecklistItem(
  client: Client,
  checklistId: number,
  personId: number,
  itemText: string,
  sortOrder: number,
): Promise<ChecklistItemRow> {
  const { data, error } = await client
    .from("checklist_items")
    .insert({
      checklist_id: checklistId,
      person_id:    personId,
      item_text:    itemText,
      sort_order:   sortOrder,
    })
    .select()
    .single();
  if (error) throw new Error(`createChecklistItem: ${error.message}`);
  return data as ChecklistItemRow;
}

export async function deleteChecklistItem(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("checklist_items").delete().eq("id", id);
  if (error) throw new Error(`deleteChecklistItem: ${error.message}`);
}

// ── People structure creation ─────────────────────────────────────────────────

export interface NewInfoGroupPayload {
  group_title: string;
  fields: Array<{ label: string; type: string }>;
}

export async function createInfoGroup(
  client: Client,
  payload: NewInfoGroupPayload,
): Promise<InfoGroupRow> {
  const { data: group, error: groupError } = await client
    .from("info_groups")
    .insert({ group_title: payload.group_title })
    .select()
    .single();
  if (groupError) throw new Error(`createInfoGroup: ${groupError.message}`);

  const validFields = payload.fields.filter((f) => f.label.trim());
  if (validFields.length > 0) {
    const { error: fieldError } = await client.from("info_field_types").insert(
      validFields.map((f, i) => ({
        group_id: (group as InfoGroupRow).id,
        field_label: f.label.trim(),
        field_type: f.type,
        sort_order: i,
      })),
    );
    if (fieldError)
      throw new Error(`createInfoGroup fields: ${fieldError.message}`);
  }
  return group as InfoGroupRow;
}

export async function createItemList(
  client: Client,
  listTitle: string,
  listLabel: string | null,
): Promise<ItemListRow> {
  const { data, error } = await client
    .from("item_lists")
    .insert({ list_title: listTitle, list_label: listLabel })
    .select()
    .single();
  if (error) throw new Error(`createItemList: ${error.message}`);
  return data as ItemListRow;
}

export interface NewLogSchemaPayload {
  log_title: string;
  fields: Array<{
    label: string;
    key: string;
    type: string;
    options: string; // comma-separated for select fields
  }>;
}

export async function createLogSchema(
  client: Client,
  payload: NewLogSchemaPayload,
): Promise<LogSchemaRow> {
  const { data: schema, error: schemaError } = await client
    .from("log_schemas")
    .insert({ log_title: payload.log_title })
    .select()
    .single();
  if (schemaError) throw new Error(`createLogSchema: ${schemaError.message}`);

  const validFields = payload.fields.filter((f) => f.label.trim());
  if (validFields.length === 0) return schema as LogSchemaRow;

  const { data: createdFields, error: fieldError } = await client
    .from("log_schema_fields")
    .insert(
      validFields.map((f, i) => ({
        log_id: (schema as LogSchemaRow).id,
        field_label: f.label.trim(),
        field_key:
          f.key.trim() || f.label.trim().toLowerCase().replace(/\s+/g, "_"),
        field_type: f.type,
        sort_order: i,
      })),
    )
    .select("id, field_type");
  if (fieldError)
    throw new Error(`createLogSchema fields: ${fieldError.message}`);

  const fieldRows = (createdFields ?? []) as Array<{
    id: number;
    field_type: string;
  }>;
  const optionInserts = validFields
    .flatMap((f, i) => {
      const created = fieldRows[i];
      if (!created || f.type !== "select" || !f.options.trim()) return [];
      return f.options.split(",").map((opt, oi) => ({
        field_id: created.id,
        option_value: opt.trim(),
        sort_order: oi,
      }));
    })
    .filter((o) => o.option_value);

  if (optionInserts.length > 0) {
    const { error: optError } = await client
      .from("log_schema_field_options")
      .insert(optionInserts);
    if (optError)
      throw new Error(`createLogSchema options: ${optError.message}`);
  }

  return schema as LogSchemaRow;
}

export async function createChecklist(
  client: Client,
  checklistTitle: string,
  checklistLabel: string | null,
): Promise<ChecklistRow> {
  const { data, error } = await client
    .from("checklists")
    .insert({
      checklist_title: checklistTitle,
      checklist_label: checklistLabel,
    })
    .select()
    .single();
  if (error) throw new Error(`createChecklist: ${error.message}`);
  return data as ChecklistRow;
}

// ── Person–structure link toggling ────────────────────────────────────────────

type StructureType = "info_group" | "list" | "log" | "checklist";

const STRUCTURE_MAP: Record<
  StructureType,
  { junction: string; idCol: string }
> = {
  info_group: { junction: "person_info_group_links", idCol: "info_group_id" },
  list: { junction: "person_item_list_links", idCol: "list_id" },
  log: { junction: "person_log_links", idCol: "log_id" },
  checklist: { junction: "person_checklist_links", idCol: "checklist_id" },
};

export async function togglePersonStructureLink(
  client: Client,
  personId: number,
  structureType: StructureType,
  structureId: number,
  link: boolean,
): Promise<void> {
  const { junction, idCol } = STRUCTURE_MAP[structureType];
  if (link) {
    const { error } = await client
      .from(junction)
      .insert({ person_id: personId, [idCol]: structureId });
    if (error)
      throw new Error(`togglePersonStructureLink insert: ${error.message}`);
  } else {
    const { error } = await client
      .from(junction)
      .delete()
      .eq("person_id", personId)
      .eq(idCol, structureId);
    if (error)
      throw new Error(`togglePersonStructureLink delete: ${error.message}`);
  }
}

export async function getSelfPerson(
  client: Client,
): Promise<{ person_name: string } | null> {
  const { data } = await client
    .from("people")
    .select("person_name")
    .eq("is_self", true)
    .maybeSingle();
  return data as { person_name: string } | null;
}

// ── Structure rename / toggle / delete ────────────────────────────────────────

export async function renameInfoGroup(
  client: Client,
  id: number,
  title: string,
): Promise<void> {
  const { error } = await client
    .from("info_groups")
    .update({ group_title: title.trim() })
    .eq("id", id);
  if (error) throw new Error(`renameInfoGroup: ${error.message}`);
}
export async function toggleInfoGroup(
  client: Client,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from("info_groups")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`toggleInfoGroup: ${error.message}`);
}
export async function deleteInfoGroup(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("info_groups").delete().eq("id", id);
  if (error) throw new Error(`deleteInfoGroup: ${error.message}`);
}

export async function renameItemList(
  client: Client,
  id: number,
  title: string,
  label: string | null,
): Promise<void> {
  const { error } = await client
    .from("item_lists")
    .update({ list_title: title.trim(), list_label: label })
    .eq("id", id);
  if (error) throw new Error(`renameItemList: ${error.message}`);
}
export async function toggleItemList(
  client: Client,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from("item_lists")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`toggleItemList: ${error.message}`);
}
export async function deleteItemList(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("item_lists").delete().eq("id", id);
  if (error) throw new Error(`deleteItemList: ${error.message}`);
}

export async function renameLogSchema(
  client: Client,
  id: number,
  title: string,
): Promise<void> {
  const { error } = await client
    .from("log_schemas")
    .update({ log_title: title.trim() })
    .eq("id", id);
  if (error) throw new Error(`renameLogSchema: ${error.message}`);
}
export async function toggleLogSchema(
  client: Client,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from("log_schemas")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`toggleLogSchema: ${error.message}`);
}
export async function deleteLogSchema(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("log_schemas").delete().eq("id", id);
  if (error) throw new Error(`deleteLogSchema: ${error.message}`);
}

export async function renameChecklist(
  client: Client,
  id: number,
  title: string,
  label: string | null,
): Promise<void> {
  const { error } = await client
    .from("checklists")
    .update({ checklist_title: title.trim(), checklist_label: label })
    .eq("id", id);
  if (error) throw new Error(`renameChecklist: ${error.message}`);
}
export async function toggleChecklist(
  client: Client,
  id: number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from("checklists")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`toggleChecklist: ${error.message}`);
}
export async function deleteChecklist(
  client: Client,
  id: number,
): Promise<void> {
  const { error } = await client.from("checklists").delete().eq("id", id);
  if (error) throw new Error(`deleteChecklist: ${error.message}`);
}

// ── Info field type CRUD ───────────────────────────────────────────────────────

export async function getInfoFieldTypes(
  client: Client,
  groupId: number,
): Promise<InfoFieldTypeRow[]> {
  const { data, error } = await client
    .from('info_field_types')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order');
  if (error) throw new Error(`getInfoFieldTypes: ${error.message}`);
  return (data ?? []) as InfoFieldTypeRow[];
}

export async function addInfoFieldType(
  client:    Client,
  groupId:   number,
  label:     string,
  fieldType: string,
  sortOrder: number,
): Promise<InfoFieldTypeRow> {
  const { data, error } = await client
    .from('info_field_types')
    .insert({ group_id: groupId, field_label: label.trim(), field_type: fieldType, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(`addInfoFieldType: ${error.message}`);
  return data as InfoFieldTypeRow;
}

export async function updateInfoFieldType(
  client:    Client,
  id:        number,
  label:     string,
  fieldType: string,
): Promise<void> {
  const { error } = await client
    .from('info_field_types')
    .update({ field_label: label.trim(), field_type: fieldType })
    .eq('id', id);
  if (error) throw new Error(`updateInfoFieldType: ${error.message}`);
}

export async function toggleInfoFieldType(
  client: Client, id: number, isActive: boolean,
): Promise<void> {
  const { error } = await client.from('info_field_types').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`toggleInfoFieldType: ${error.message}`);
}

export async function deleteInfoFieldType(client: Client, id: number): Promise<void> {
  const { error } = await client.from('info_field_types').delete().eq('id', id);
  if (error) throw new Error(`deleteInfoFieldType: ${error.message}`);
}

// ── Log schema field CRUD ──────────────────────────────────────────────────────

export async function getLogSchemaFields(
  client: Client,
  logId:  number,
): Promise<LogSchemaFieldRow[]> {
  const { data, error } = await client
    .from('log_schema_fields')
    .select('*')
    .eq('log_id', logId)
    .order('sort_order');
  if (error) throw new Error(`getLogSchemaFields: ${error.message}`);
  return (data ?? []) as LogSchemaFieldRow[];
}

export async function getLogSchemaFieldOptions(
  client:   Client,
  fieldIds: number[],
): Promise<LogSchemaFieldOptionRow[]> {
  if (fieldIds.length === 0) return [];
  const { data, error } = await client
    .from('log_schema_field_options')
    .select('*')
    .in('field_id', fieldIds)
    .order('sort_order');
  if (error) throw new Error(`getLogSchemaFieldOptions: ${error.message}`);
  return (data ?? []) as LogSchemaFieldOptionRow[];
}

export async function addLogSchemaField(
  client:    Client,
  logId:     number,
  label:     string,
  key:       string,
  fieldType: string,
  sortOrder: number,
): Promise<LogSchemaFieldRow> {
  const resolvedKey = key.trim() || label.trim().toLowerCase().replace(/\s+/g, '_');
  const { data, error } = await client
    .from('log_schema_fields')
    .insert({ log_id: logId, field_label: label.trim(), field_key: resolvedKey, field_type: fieldType, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(`addLogSchemaField: ${error.message}`);
  return data as LogSchemaFieldRow;
}

export async function updateLogSchemaField(
  client:    Client,
  id:        number,
  label:     string,
  key:       string,
  fieldType: string,
): Promise<void> {
  const { error } = await client
    .from('log_schema_fields')
    .update({ field_label: label.trim(), field_key: key.trim(), field_type: fieldType })
    .eq('id', id);
  if (error) throw new Error(`updateLogSchemaField: ${error.message}`);
}

/** Replaces all options for a select field (delete + re-insert). */
export async function setLogSchemaFieldOptions(
  client:  Client,
  fieldId: number,
  options: string[],
): Promise<void> {
  await client.from('log_schema_field_options').delete().eq('field_id', fieldId);
  const valid = options.map(o => o.trim()).filter(Boolean);
  if (valid.length === 0) return;
  const { error } = await client
    .from('log_schema_field_options')
    .insert(valid.map((option_value, i) => ({ field_id: fieldId, option_value, sort_order: i })));
  if (error) throw new Error(`setLogSchemaFieldOptions: ${error.message}`);
}

export async function toggleLogSchemaField(
  client: Client, id: number, isActive: boolean,
): Promise<void> {
  const { error } = await client.from('log_schema_fields').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`toggleLogSchemaField: ${error.message}`);
}

export async function deleteLogSchemaField(client: Client, id: number): Promise<void> {
  const { error } = await client.from('log_schema_fields').delete().eq('id', id);
  if (error) throw new Error(`deleteLogSchemaField: ${error.message}`);
}

// (getChecklistItemsForStructure and updateChecklistItem removed — checklist items are per-person, not template items)

// ── Diagnosis CRUD ────────────────────────────────────────────────────────────

export async function addDiagnosis(
  client: Client, personId: number, name: string,
  date: string | null, notes: string | null, sortOrder: number,
): Promise<DiagnosisRow> {
  const { data, error } = await client
    .from('diagnoses')
    .insert({ person_id: personId, diagnosis_name: name.trim(), diagnosed_date: date, notes, sort_order: sortOrder })
    .select().single();
  if (error) throw new Error(`addDiagnosis: ${error.message}`);
  return data as DiagnosisRow;
}

export async function updateDiagnosis(
  client: Client, id: number, name: string, date: string | null, notes: string | null,
): Promise<void> {
  const { error } = await client.from('diagnoses')
    .update({ diagnosis_name: name.trim(), diagnosed_date: date, notes }).eq('id', id);
  if (error) throw new Error(`updateDiagnosis: ${error.message}`);
}

export async function toggleDiagnosis(client: Client, id: number, isActive: boolean): Promise<void> {
  const { error } = await client.from('diagnoses').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`toggleDiagnosis: ${error.message}`);
}

export async function deleteDiagnosis(client: Client, id: number): Promise<void> {
  const { error } = await client.from('diagnoses').delete().eq('id', id);
  if (error) throw new Error(`deleteDiagnosis: ${error.message}`);
}
