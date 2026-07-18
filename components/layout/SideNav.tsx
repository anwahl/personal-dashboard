'use client';

import Link              from 'next/link';
import { usePathname }   from 'next/navigation';
import { SideCalendar }  from './SideCalendar';

const NAV = [
  { href: '/',             emoji: '🏠', label: 'Hub' },
  { href: '/daily',        emoji: '📅', label: 'Today' },
  { href: '/health',       emoji: '🩺', label: 'Health' },
  { href: '/tasks',        emoji: '✅', label: 'Tasks' },
  { href: '/appointments', emoji: '🏥', label: 'Appointments' },
  { href: '/medications',  emoji: '💊', label: 'Medications' },
  { href: '/media',        emoji: '🎬', label: 'Media' },
  { href: '/people/annie', emoji: '👤', label: 'People' },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function SideNav() {
  const path = usePathname();

  return (
    <nav className="side-nav" aria-label="Main navigation">
      <div className="side-nav__brand">Dashboard</div>
      <ul className="side-nav__list">
        {NAV.map(({ href, emoji, label }) => {
          const dest = href === '/daily' ? `/daily/${todayISO()}` : href;
          const isActive =
            href === '/daily' ? path.startsWith('/daily') :
            href === '/'      ? path === '/' :
            path.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={dest}
                className={`side-nav__link${isActive ? ' side-nav__link--active' : ''}`}
              >
                <span className="side-nav__link-icon">{emoji}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Calendar lives at the bottom of the sidebar */}
      <SideCalendar />
    </nav>
  );
}
