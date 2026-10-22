'use client';

/**
 * SortableList — drag-to-reorder for lists, including moving items between
 * groups (e.g. categories). This is the only file that imports @dnd-kit, so
 * the library (pre-1.0) can change without touching the lists that use it.
 *
 *   <SortableList onMove={handleMove}>
 *     <SortableGroup id="cat:1">                     ← optional; lets an empty
 *       {items.map((item, i) => (                       group receive items
 *         <SortableItem key={item.id} id={`item:${item.id}`} index={i} group="cat:1">
 *           {({ ref, handleRef }) => (
 *             <ManageItem ref={ref} handle={<DragHandle ref={handleRef} />}>…</ManageItem>
 *           )}
 *         </SortableItem>
 *       ))}
 *     </SortableGroup>
 *   </SortableList>
 *
 * Dragging only starts from the DragHandle, so swiping elsewhere on a row
 * still scrolls the page. Touch: press and hold the handle (~¼s). Keyboard:
 * focus the handle, Space to pick up, arrow keys to move, Space to drop.
 *
 * onMove reports a finished move as plain indices; the caller updates its own
 * state and persists the new order.
 */

import { type ReactNode, type Ref } from 'react';
import { DragDropProvider, useDroppable } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { GripVertical } from 'lucide-react';
import { Button } from './Button';

export interface SortMove {
  /** The moved item's sortable id. */
  id:        string;
  /** The item's `type` (e.g. 'item' or 'group-heading'). */
  type:      string;
  fromGroup: string | undefined;
  fromIndex: number;
  toGroup:   string | undefined;
  toIndex:   number;
}

const GROUP_TYPE = 'sortable-group';
/** CollisionPriority.Low in @dnd-kit/abstract (not re-exported by @dnd-kit/react):
 *  items inside a group win over the group container itself. */
const LOW_COLLISION_PRIORITY = 1;

// ── Provider ──────────────────────────────────────────────────────────────────

export function SortableList({
  onMove,
  children,
}: Readonly<{
  onMove:   (move: SortMove) => void;
  children: ReactNode;
}>) {
  return (
    <DragDropProvider
      onDragEnd={event => {
        if (event.canceled) return;
        const { source, target } = event.operation;
        if (!isSortable(source)) return;

        const fromGroup = source.initialGroup == null ? undefined : String(source.initialGroup);
        let   toGroup   = source.group == null ? undefined : String(source.group);
        let   toIndex   = source.index;

        // Dropped onto an (empty) group container rather than onto an item.
        if (target && target.type === GROUP_TYPE && String(target.id) !== toGroup) {
          toGroup = String(target.id);
          toIndex = 0;
        }

        if (fromGroup === toGroup && source.initialIndex === toIndex) return;

        onMove({
          id:        String(source.id),
          type:      String(source.type ?? ''),
          fromGroup,
          fromIndex: source.initialIndex,
          toGroup,
          toIndex,
        });
      }}
    >
      {children}
    </DragDropProvider>
  );
}

// ── Item ──────────────────────────────────────────────────────────────────────

interface SortableItemRenderProps {
  /** Attach to the row element. */
  ref:        (el: Element | null) => void;
  /** Attach to the drag handle (pass to <DragHandle ref={…} />). */
  handleRef:  (el: Element | null) => void;
  isDragging: boolean;
}

export function SortableItem({
  id,
  index,
  group,
  type = 'item',
  accept,
  disabled = false,
  children,
}: Readonly<{
  id:        string;
  index:     number;
  group?:    string;
  /** Items only sort among others of the same type unless `accept` says otherwise. */
  type?:     string;
  accept?:   string | string[];
  disabled?: boolean;
  children:  (props: SortableItemRenderProps) => ReactNode;
}>) {
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    group,
    type,
    accept: accept ?? type,
    disabled,
  });
  return <>{children({ ref, handleRef, isDragging })}</>;
}

// ── Group (droppable container) ───────────────────────────────────────────────

/** Lets items be dropped into this group even when it's empty. */
export function SortableGroup({
  id,
  accept = 'item',
  className,
  children,
}: Readonly<{
  id:         string;
  accept?:    string | string[];
  className?: string;
  children:   ReactNode;
}>) {
  const { ref } = useDroppable({
    id,
    type: GROUP_TYPE,
    accept,
    collisionPriority: LOW_COLLISION_PRIORITY,
  });
  return <div ref={ref} className={className}>{children}</div>;
}

// ── Handle ────────────────────────────────────────────────────────────────────

export function DragHandle({
  ref,
  label = 'Drag to reorder',
}: Readonly<{
  ref?:   Ref<HTMLButtonElement> | ((el: Element | null) => void);
  label?: string;
}>) {
  return (
    <Button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      variant="ghost"
      size="icon"
      className="drag-handle"
      aria-label={label}
    >
      <GripVertical size={18} aria-hidden="true" />
    </Button>
  );
}
