'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',             emoji: '🏠', label: 'Hub' },
  { href: '/daily',        emoji: '📅', label: 'Today' },
  { href: '/tasks',        emoji: '✅', label: 'Tasks' },
  { href: '/appointments', emoji: '🏥', label: 'Appointments' },
  { href: '/brain-dump',   emoji: '🧠', label: 'Brain Dump' },
  { href: '/medications',  emoji: '💊', label: 'Medications' },
  { href: '/media',        emoji: '🎬', label: 'Media' },
  { href: '/people',       emoji: '👤', label: 'People' },
  { href: '/analytics',    emoji: '📊', label: 'Analytics' },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {NAV.map(({ href, emoji, label }) => {
        const dest = href === '/daily' ? `/daily/${todayISO()}` : href;
        const isActive =
          href === '/daily' ? path.startsWith('/daily') :
          href === '/'      ? path === '/' :
          path.startsWith(href);

        return (
          <Link
            key={href}
            href={dest}
            className={`bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`}
          >
            <span className="bottom-nav__link-icon">{emoji}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
