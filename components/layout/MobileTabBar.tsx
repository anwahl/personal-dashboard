'use client';

/**
 * MobileTabBar — the bottom navigation on phone-width screens (< 768px).
 *
 *   Home · Today · ＋ (Quick add) · Calendar · More
 *
 * Docked full-width with safe-area padding. The desktop SideNav is separate
 * and unchanged; globals.css hides one or the other by width.
 */

import { useState, type ReactNode } from 'react';
import { usePathname }  from 'next/navigation';
import { CalendarCheck, CalendarDays, House, LayoutGrid, Plus } from 'lucide-react';
import { Button }        from '@/components/ui';
import { MoreSheet }     from './MoreSheet';
import { QuickAddSheet } from './QuickAddSheet';
import { isMoreActive }  from '@/lib/constants/nav';
import { useTodayHref }  from '@/lib/hooks/useLocalToday';

/** Icon with the pill highlight shown behind it on the active tab. */
function TabIcon({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="btn__icon">{children}</span>;
}

export function MobileTabBar() {
  const path      = usePathname();
  const todayHref = useTodayHref();

  const [moreOpen,  setMoreOpen]  = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const current = (active: boolean) => (active ? 'page' as const : undefined);

  return (
    <>
      <nav className="mobile-tabbar" aria-label="Main">
        <Button href="/" variant="nav" aria-current={current(path === '/')}>
          <TabIcon><House size={24} strokeWidth={1.8} aria-hidden="true" /></TabIcon>
          Home
        </Button>

        <Button href={todayHref} variant="nav" aria-current={current(path.startsWith('/daily'))}>
          <TabIcon><CalendarCheck size={24} strokeWidth={1.8} aria-hidden="true" /></TabIcon>
          Today
        </Button>

        <Button
          type="button"
          variant="primary"
          size="icon"
          className="mobile-tabbar__add"
          aria-label="Quick add"
          aria-haspopup="dialog"
          aria-expanded={quickOpen}
          onClick={() => setQuickOpen(true)}
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
        </Button>

        <Button href="/calendar" variant="nav" aria-current={current(path.startsWith('/calendar'))}>
          <TabIcon><CalendarDays size={24} strokeWidth={1.8} aria-hidden="true" /></TabIcon>
          Calendar
        </Button>

        <Button
          type="button"
          variant="nav"
          data-active={isMoreActive(path) || undefined}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          <TabIcon><LayoutGrid size={24} strokeWidth={1.8} aria-hidden="true" /></TabIcon>
          More
        </Button>
      </nav>

      <MoreSheet     open={moreOpen}  onOpenChange={setMoreOpen} />
      <QuickAddSheet open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
