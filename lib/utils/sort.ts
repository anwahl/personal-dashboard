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
 * Given a sorted array of items and two indices to swap, returns a flat
 * list of `{ id, sort_order }` updates that reassigns clean sequential
 * sort_orders (0, 1, 2, …) after the swap.
 *
 * This fixes the "all items at sort_order = 0" problem — swapping two
 * zeros would change nothing, so we normalize the whole active list
 * as part of every move operation.
 */
export function normalizedReorderUpdates<
  T extends { id: number; sort_order?: number },
>(
  sorted: T[],
  idx: number,
  swapIdx: number,
): Array<{ id: number; sort_order: number }> {
  const reordered = [...sorted];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  return reordered.map((item, i) => ({ id: item.id, sort_order: i }));
}
