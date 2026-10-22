'use client';

/**
 * ModeToggle — the "✏️ Edit" / "👁 View" button for pages with a view mode
 * and an edit mode.
 *
 *   <ModeToggle editing={mode === 'edit'} onChange={e => setMode(e ? 'edit' : 'view')} />
 *
 * On pages where edit mode swaps in a form with its own Cancel, the button
 * is only shown in view mode, so it always reads "✏️ Edit".
 */

import { Button } from './Button';

export function ModeToggle({
  editing, onChange, className,
}: Readonly<{
  editing:    boolean;
  onChange:   (editing: boolean) => void;
  className?: string;
}>) {
  return (
    <Button variant="ghost" size="sm" className={className} onClick={() => onChange(!editing)}>
      {editing ? '👁 View' : '✏️ Edit'}
    </Button>
  );
}
