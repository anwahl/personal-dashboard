'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',      emoji: '🏠', label: 'Hub' },
  { href: '/daily', emoji: '📅', label: 'Today' },
  { href: '/health',emoji: '🩺', label: 'Health' },
  { href: '/tasks', emoji: '✅', label: 'Tasks' },
  { href: '/media', emoji: '🎬', label: 'Media' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
