/**
 * lib/dal/placement.ts
 *
 * Where things show: area (HOME / QUICKADD / DAILY) → sections → cards →
 * trackable categories and components. Not placed = not shown.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Area,
  Module,
  SectionRow,
  SectionCardRow,
  TrackableCategoryCardRow,
  ComponentCardRow,
} from "@/types/schema";
import type { SectionDetail, CardItem } from "@/types/dal";

type Client = SupabaseClient;
type SortUpdate = { id: number; sort_order: number };

const bySort = (a: { sort_order: number; id: number }, b: { sort_order: number; id: number }) =>
  a.sort_order - b.sort_order || a.id - b.id;

async function all<T>(label: string, q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(`${label}: ${error.message}`);
  return (data ?? []) as T[];
}

async function one<T>(label: string, q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data as T;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Sections with their cards and each card's items, in order.
 * With an area: only that area. includeInactive=false drops inactive
 * sections and cards (for drawing pages); settings pass true.
 */
export async function getSections(client: Client, area?: Area, includeInactive = false): Promise<SectionDetail[]> {
  let sq = client.from("sections").select("*");
  if (area) sq = sq.eq("area", area);
  if (!includeInactive) sq = sq.eq("is_active", true);

  const sections = await all<SectionRow>("sections", sq);
  if (!sections.length) return [];

  let cq = client.from("section_cards").select("*").in("section_id", sections.map(s => s.id));
  if (!includeInactive) cq = cq.eq("is_active", true);
  const cards = await all<SectionCardRow>("section_cards", cq);
  const cardIds = cards.map(c => c.id);

  const [catItems, modItems] = cardIds.length
    ? await Promise.all([
        all<TrackableCategoryCardRow>("trackable_category_cards",
          client.from("trackable_category_cards").select("*").in("card_id", cardIds)),
        all<ComponentCardRow>("component_cards",
          client.from("component_cards").select("*").in("card_id", cardIds)),
      ])
    : [[], []];

  const itemsOf = (cardId: number): CardItem[] => [
    ...catItems.filter(i => i.card_id === cardId).map(i => ({
      kind: "category" as const, placement_id: i.id, sort_order: i.sort_order, category_id: i.trackable_category_id,
    })),
    ...modItems.filter(i => i.card_id === cardId).map(i => ({
      kind: "module" as const, placement_id: i.id, sort_order: i.sort_order, module: i.module,
    })),
  ].sort((a, b) => a.sort_order - b.sort_order);

  return [...sections].sort(bySort).map(s => ({
    ...s,
    cards: cards.filter(c => c.section_id === s.id).sort(bySort).map(c => ({ ...c, items: itemsOf(c.id) })),
  }));
}

/** Whether any trackable category is placed in these sections. */
export function hasCategories(sections: SectionDetail[]): boolean {
  return sections.some(s => s.cards.some(c => c.items.some(i => i.kind === "category")));
}

/** Every module placed in an area's active sections and cards. */
export function modulesIn(sections: SectionDetail[]): Set<Module> {
  return new Set(sections.flatMap(s => s.cards.flatMap(c =>
    c.items.flatMap(i => i.kind === "module" ? [i.module] : []))));
}

// ── Sections ──────────────────────────────────────────────────────────────────

export async function addSection(client: Client, area: Area, name: string, sortOrder: number): Promise<SectionRow> {
  return one("addSection", client.from("sections")
    .insert({ area, name: name.trim(), sort_order: sortOrder }).select().single());
}

export async function renameSection(client: Client, id: number, name: string): Promise<void> {
  await client.from("sections").update({ name: name.trim() }).eq("id", id).throwOnError();
}

export async function toggleSection(client: Client, id: number, isActive: boolean): Promise<void> {
  await client.from("sections").update({ is_active: isActive }).eq("id", id).throwOnError();
}

async function setSortOrders(client: Client, table: string, updates: SortUpdate[]) {
  const results = await Promise.all(
    updates.map(({ id, sort_order }) => client.from(table).update({ sort_order }).eq("id", id)),
  );
  for (const r of results) if (r.error) throw new Error(`${table} order: ${r.error.message}`);
}

export const reorderSections = (client: Client, updates: SortUpdate[]) =>
  setSortOrders(client, "sections", updates);

// ── Cards ─────────────────────────────────────────────────────────────────────

export async function addCard(client: Client, sectionId: number, title: string | null, sortOrder: number): Promise<SectionCardRow> {
  return one("addCard", client.from("section_cards")
    .insert({ section_id: sectionId, title: title?.trim() || null, sort_order: sortOrder }).select().single());
}

export async function updateCardTitle(client: Client, id: number, title: string | null): Promise<void> {
  await client.from("section_cards").update({ title: title?.trim() || null }).eq("id", id).throwOnError();
}

export async function toggleCard(client: Client, id: number, isActive: boolean): Promise<void> {
  await client.from("section_cards").update({ is_active: isActive }).eq("id", id).throwOnError();
}

export async function moveCard(client: Client, id: number, sectionId: number): Promise<void> {
  await client.from("section_cards").update({ section_id: sectionId }).eq("id", id).throwOnError();
}

export const reorderCards = (client: Client, updates: SortUpdate[]) =>
  setSortOrders(client, "section_cards", updates);

// ── Card items ────────────────────────────────────────────────────────────────

export async function addCategoryToCard(client: Client, cardId: number, categoryId: number, sortOrder: number): Promise<CardItem> {
  const row = await one<TrackableCategoryCardRow>("addCategoryToCard", client.from("trackable_category_cards")
    .insert({ card_id: cardId, trackable_category_id: categoryId, sort_order: sortOrder }).select().single());
  return { kind: "category", placement_id: row.id, sort_order: row.sort_order, category_id: row.trackable_category_id };
}

export async function addModuleToCard(client: Client, cardId: number, module: Module, sortOrder: number): Promise<CardItem> {
  const row = await one<ComponentCardRow>("addModuleToCard", client.from("component_cards")
    .insert({ card_id: cardId, module, sort_order: sortOrder }).select().single());
  return { kind: "module", placement_id: row.id, sort_order: row.sort_order, module: row.module };
}

const ITEM_TABLE = { category: "trackable_category_cards", module: "component_cards" } as const;

export async function removeCardItem(client: Client, kind: CardItem["kind"], placementId: number): Promise<void> {
  await client.from(ITEM_TABLE[kind]).delete().eq("id", placementId).throwOnError();
}

/** Sets the order of a card's items (both kinds share one order). */
export async function reorderCardItems(
  client: Client, updates: { kind: CardItem["kind"]; placement_id: number; sort_order: number }[],
): Promise<void> {
  await Promise.all([
    setSortOrders(client, ITEM_TABLE.category,
      updates.filter(u => u.kind === "category").map(u => ({ id: u.placement_id, sort_order: u.sort_order }))),
    setSortOrders(client, ITEM_TABLE.module,
      updates.filter(u => u.kind === "module").map(u => ({ id: u.placement_id, sort_order: u.sort_order }))),
  ]);
}
