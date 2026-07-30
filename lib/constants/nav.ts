/**
 * lib/constants/nav.ts
 *
 * Single source of truth for the main navigation items.
 * Used by both SideNav and BottomNav.
 */

export interface NavItem {
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
