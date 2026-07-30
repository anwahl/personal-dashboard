'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isNavActive } from '@/lib/constants/nav';
import { localTodayISO }          from '@/lib/utils/dates';

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map(({ href, emoji, label }) => {
        const dest   = href === '/daily' ? `/daily/${localTodayISO()}` : href;
        const active = isNavActive(href, path);

        return (
          <Link
            key={href}
            href={dest}
            className={`bottom-nav__link${active ? ' bottom-nav__link--active' : ''}`}
          >
            <span className="bottom-nav__link-icon">{emoji}</span>
            {label}
          </Link>
        );
      })}
      <hr className="vertical-rule" />
      <div className="bottom-nav__footer">
        <Link
          key ="/settings"
          href="/settings"
          className={`bottom-nav__link${path === '/settings' ? ' bottom-nav__link--active' : ''}`}
        >
          <span className="bottom-nav__link-icon">⚙️</span>
          Settings
        </Link>
      </div>
    </nav>
  );
}
