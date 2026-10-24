'use client';

/**
 * AddButton — the ＋ in a card header that adds to that card's list
 * (e.g. "Add task" on the hub's task list). Pair it with a RowMenu (⋯)
 * for the card's other actions.
 *
 * On a module's own page, the add action is a "+ New …" button in the
 * bottom bar (FieldActions docked) instead.
 */

import { Plus } from 'lucide-react';
import { Button } from './Button';

export function AddButton({
  label, onClick,
}: Readonly<{
  /** What it adds, e.g. "Add task" (its accessible name and tooltip). */
  label:   string;
  onClick: () => void;
}>) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label} title={label}>
      <Plus size={18} aria-hidden="true" />
    </Button>
  );
}
