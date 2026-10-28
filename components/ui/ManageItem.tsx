/**
 * ManageItem — the single row layout for settings-style lists.
 *
 *   [⠿ handle]  name / content ………………  [inline]  [⋯ menu]
 *
 * While editing, `editing` replaces the whole row's content (the caller
 * renders its fields and ✓ / ✕ buttons there).
 *
 *   <ManageItem
 *     ref={ref}                              ← from SortableItem, when sortable
 *     handle={<DragHandle ref={handleRef} />}
 *     menu={<RowMenu label={name} items={…} />}
 *     inactive={!item.is_active}
 *   >
 *     {name}
 *   </ManageItem>
 */

import type { ReactNode, Ref } from 'react';

/** The rows of a settings list (ManageItems), spaced from what follows. */
export function ManageList({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="manage-list">{children}</div>;
}

/**
 * The add row under a settings list: inputs and an Add button on one
 * wrapping line, with any Hint on its own line below.
 */
export function ManageAddRow({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="manage-add-row">{children}</div>;
}

/**
 * Faint secondary text after a row's name (a date, a practice, tags).
 * `truncate` cuts long text (notes, tags) to one line.
 *
 *   <ManageItem …>{name}<ManageItemMeta truncate>{notes}</ManageItemMeta></ManageItem>
 */
export function ManageItemMeta({ truncate = false, children }: Readonly<{ truncate?: boolean; children: ReactNode }>) {
  return <span className={truncate ? 'manage-item__meta manage-item__meta--truncate' : 'manage-item__meta'}>{children}</span>;
}

interface ManageItemProps {
  children:   ReactNode;
  /** Drag handle (DragHandle) — present when the list is sortable. */
  handle?:    ReactNode;
  /** Shown between the name and the menu (badges, small controls). */
  inline?:    ReactNode;
  /** The row's ⋯ menu (RowMenu). */
  menu?:      ReactNode;
  /** When set, replaces the row's content (edit mode). */
  editing?:   ReactNode;
  inactive?:  boolean;
  italic?:    boolean;
  /** Visual state while being dragged. */
  dragging?:  boolean;
  /** Heading rows (e.g. a category in a grouped list) are styled bolder. */
  heading?:   boolean;
  className?: string;
  ref?:       Ref<HTMLDivElement> | ((el: Element | null) => void);
}

export function ManageItem({
  children, handle, inline, menu, editing,
  inactive = false, italic = false, dragging = false, heading = false,
  className, ref,
}: Readonly<ManageItemProps>) {
  const classes = [
    'manage-item',
    editing ? 'manage-item--editing' : 'manage-item--line',
    inactive ? 'manage-item--inactive' : null,
    dragging ? 'manage-item--dragging' : null,
    heading  ? 'manage-item--heading'  : null,
    className,
  ].filter(Boolean).join(' ');

  const nameClass = ['manage-item__name', italic ? 'manage-item__name--italic' : null]
    .filter(Boolean).join(' ');

  return (
    <div ref={ref as Ref<HTMLDivElement>} className={classes}>
      {editing ?? (
        <>
          {handle}
          <div className={nameClass}>{children}</div>
          {inline}
          {menu}
        </>
      )}
    </div>
  );
}
