/**
 * InactiveGroup — a folded list of items that are switched off
 * ("3 inactive ▸"). Renders nothing when there are none.
 *
 *   <InactiveGroup count={inactive.length}>
 *     {inactive.map(renderRow)}
 *   </InactiveGroup>
 */

import type { ReactNode } from 'react';

export function InactiveGroup({
  count,
  label,
  children,
}: Readonly<{
  count:    number;
  /** Summary text. Default: "{count} inactive". */
  label?:   ReactNode;
  children: ReactNode;
}>) {
  if (count === 0) return null;
  return (
    <details className="inactive-group">
      <summary className="inactive-group__summary">{label ?? `${count} inactive`}</summary>
      <div className="inactive-group__body">{children}</div>
    </details>
  );
}
