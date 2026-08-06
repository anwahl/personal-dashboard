'use client';

import Link              from 'next/link';
import { usePathname }   from 'next/navigation';
import { SideCalendar }  from './SideCalendar';
import { NAV_ITEMS, isNavActive } from '@/lib/constants/nav';
import { localTodayISO }          from '@/lib/utils/dates';

export function SideNav() {
  const path = usePathname();

  return (
    <nav className="side-nav" aria-label="Main navigation">
      <div className="side-nav__brand">
        <Link className='side-nav__link' href='/'>
          🏠 Dashboard
        </Link>
      </div>
      <ul className="side-nav__list">
        {NAV_ITEMS.map(({ href, emoji, label }) => {
          const dest   = href === '/daily' ? `/daily/${localTodayISO()}` : href;
          const active = isNavActive(href, path);

          return (
            <li key={href}>
              <Link
                href={dest}
                className={`side-nav__link${active ? ' side-nav__link--active' : ''}`}
              >
                <span className="side-nav__link-icon">{emoji}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <SideCalendar />

      <div className="side-nav__footer">
        <Link
          href="/settings"
          className={`side-nav__link${path === '/settings' ? ' side-nav__link--active' : ''}`}
        >
          ⚙️ Settings
        </Link>
      </div>
    </nav>
  );
}
