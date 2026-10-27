/**
 * lib/constants/nav.ts
 *
 * Single source of truth for the main navigation items.
 * Used by SideNav (desktop) and MobileTabBar + its More sheet (mobile).
 */

interface NavItem {
  href: string;
  emoji: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/daily", emoji: "📅", label: "Today" },
  { href: "/tasks", emoji: "✅", label: "Tasks" },
  { href: "/appointments", emoji: "🏥", label: "Appointments" },
  { href: "/brain-dump", emoji: "🧠", label: "Brain Dump" },
  { href: "/medications", emoji: "💊", label: "Medications" },
  { href: "/media", emoji: "🎬", label: "Media" },
  { href: "/last-time", emoji: "⏱️", label: "Last Time" },
  { href: "/people", emoji: "👤", label: "People" },
  { href: "/analytics", emoji: "📊", label: "Analytics" },
];

/**
 * Returns true if the given nav item should be considered active
 * for the supplied pathname.
 */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/daily") return pathname.startsWith("/daily");
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/**
 * Mobile navigation (components/layout/MobileTabBar.tsx).
 *
 * The tab bar itself is Home / Today / Quick add / Calendar / More. Everything
 * else lives in the More sheet, grouped by section. `icon` is a key the sheet
 * maps to an icon component, so this file stays plain data.
 */
export type MoreIconKey =
  | 'tasks' | 'appointments' | 'medications' | 'analytics'
  | 'brain-dump' | 'media' | 'last-time' | 'people' | 'weekly-journal';

export interface MoreItem {
  href:  string;
  label: string;
  icon:  MoreIconKey;
}

interface MoreSection {
  title: string;
  items: MoreItem[];
}

export const MORE_SECTIONS: MoreSection[] = [
  {
    title: 'Health',
    items: [
      { href: '/appointments', label: 'Appointments', icon: 'appointments' },
      { href: '/medications',  label: 'Medications',  icon: 'medications'  },
      { href: '/analytics',    label: 'Analytics',    icon: 'analytics'    },
    ],
  },
  {
    title: 'Life',
    items: [
      { href: '/tasks',          label: 'Tasks',          icon: 'tasks'          },
      { href: '/brain-dump',     label: 'Brain Dump',     icon: 'brain-dump'     },
      { href: '/media',          label: 'Media',          icon: 'media'          },
      { href: '/last-time',      label: 'Last Time',      icon: 'last-time'      },
      { href: '/people',         label: 'People',         icon: 'people'         },
      { href: '/journal/weekly', label: 'Weekly Journal', icon: 'weekly-journal' },
    ],
  },
];

/** True when the current path belongs to a page reached through the More sheet. */
export function isMoreActive(pathname: string): boolean {
  return pathname.startsWith('/settings')
    || MORE_SECTIONS.some(section => section.items.some(item => pathname.startsWith(item.href)));
}

/** A daily tab: a DAILY section's ?tab= id (see sectionTabId). */
export type DailyTabId = string;

/** The ?tab= id of a DAILY section's tab. */
export const sectionTabId = (sectionId: number): DailyTabId => `section-${sectionId}`;

// ── Settings Tabs ──────────────────────────────────────────────────────────────────────

export type SettingsTabId =
  | 'daily'
  | 'tracking'
  | 'layout'
  | 'charts'
  | 'lasttime'
  | 'journal'
  | 'providers'
  | 'people'
  | 'icons'
  | 'integrations';

export const SETTINGS_TABS = [
  { id: 'daily',     label: '📅 Daily'     },
  { id: 'tracking',  label: '📊 Tracking'  },
  { id: 'layout',    label: '🧩 Layout'    },
  { id: 'charts',    label: '📈 Charts'    },
  { id: 'lasttime',  label: '⏱ Last Time'  },
  { id: 'journal',   label: '📔 Journal'   },
  { id: 'providers', label: '🏥 Providers' },
  { id: 'people',    label: '👤 People'    },
  { id: 'icons',         label: '✦ Icons'        },
  { id: 'integrations',  label: '🔗 Integrations' },
] as const satisfies { id: SettingsTabId; label: string }[];