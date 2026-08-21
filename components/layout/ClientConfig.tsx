'use client';

/**
 * Client-side configuration wrapper placed in the root layout (app/layout.tsx).
 *
 * Provides:
 *   - SWRConfig  — sets cache behavior for all SWR hooks in the app:
 *                  no revalidation on focus/reconnect (reference data is stable),
 *                  5-minute dedup window so concurrent hook calls share one fetch.
 *   - ToastProvider — global notification context (see components/ui/Toast.tsx).
 *
 * Must be a Client Component because both SWRConfig and ToastProvider rely on
 * React context. Passing children as a prop (rather than rendering them here)
 * lets Server Component subtrees render on the server as normal — they are
 * simply slotted in as opaque React nodes.
 */

import type { ReactNode } from 'react';
import { SWRConfig }      from 'swr';
import { ToastProvider }  from '@/components/ui/Toast';

const SWR_CONFIG = {
  /** Don't refetch when the user tabs back to the window. */
  revalidateOnFocus:     false,
  /** Don't refetch when the browser reconnects to the network. */
  revalidateOnReconnect: false,
  /**
   * 2.5-minute dedup window.  If two components mount and both call e.g.
   * usePeople() within the same 2.5 minutes, only one network request is made.
   */
  dedupingInterval: 150_000,
} as const;

export function ClientConfig({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SWRConfig value={SWR_CONFIG}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SWRConfig>
  );
}
