/**
 * lib/utils/sort.ts
 *
 * Sort-order helpers shared by ManageableList, SymptomSettings, JournalSettings,
 * and any other component that manages an ordered list of DB rows.
 */

/** Stable comparator — sorts by sort_order, breaking ties by id. */
export function bySortOrder<T extends { id: number; sort_order?: number }>(
  a: T,
  b: T,
): number {
  const oA = a.sort_order ?? 0;
  const oB = b.sort_order ?? 0;
  return oA !== oB ? oA - oB : a.id - b.id;
}

/**
 * Moves the item at `from` to `to` (as drag-and-drop does) and returns
 * clean sequential sort_orders (0, 1, 2, …) for the whole list.
 */
export function reorderUpdates<T extends { id: number }>(
  sorted: T[],
  from: number,
  to: number,
): Array<{ id: number; sort_order: number }> {
  const reordered = [...sorted];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered.map((item, i) => ({ id: item.id, sort_order: i }));
}

/** Sequential sort_orders (0, 1, 2, …) for a list already in its new order. */
export function sequentialUpdates<T extends { id: number }>(
  ordered: T[],
): Array<{ id: number; sort_order: number }> {
  return ordered.map((item, i) => ({ id: item.id, sort_order: i }));
}
