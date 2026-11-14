/**
 * The app's navigation, used by the desktop sidebar, the mobile tab bar and
 * its More sheet. Plain data; each place renders it its own way.
 */
import type { Component } from 'svelte';
import BrainIcon from '@lucide/svelte/icons/brain';
import CalendarCheckIcon from '@lucide/svelte/icons/calendar-check';
import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
import ChartLineIcon from '@lucide/svelte/icons/chart-line';
import ClapperboardIcon from '@lucide/svelte/icons/clapperboard';
import HouseIcon from '@lucide/svelte/icons/house';
import PillIcon from '@lucide/svelte/icons/pill';
import SettingsIcon from '@lucide/svelte/icons/settings';
import SquareCheckIcon from '@lucide/svelte/icons/square-check';
import StethoscopeIcon from '@lucide/svelte/icons/stethoscope';
import TimerIcon from '@lucide/svelte/icons/timer';
import UsersIcon from '@lucide/svelte/icons/users';
import { localToday } from '#lib/dates.ts';

export interface NavItem {
	label: string;
	/** A function when the link depends on the moment it's clicked (e.g. today's date). */
	href: string | (() => string);
	/** Paths under this prefix count as this item being active. */
	match: string;
	icon: Component;
}

export const HOME: NavItem = { label: 'Home', href: '/', match: '/', icon: HouseIcon };
export const TODAY: NavItem = {
	label: 'Today',
	href: () => `/daily/${localToday()}`,
	match: '/daily',
	icon: CalendarCheckIcon
};
export const CALENDAR: NavItem = {
	label: 'Calendar',
	href: '/calendar',
	match: '/calendar',
	icon: CalendarDaysIcon
};
export const SETTINGS: NavItem = {
	label: 'Settings',
	href: '/settings',
	match: '/settings',
	icon: SettingsIcon
};

/** Pages besides Home and Today, in sidebar order. On mobile they live in the More sheet. */
export const PAGES: NavItem[] = [
	{ label: 'Tasks', href: '/tasks', match: '/tasks', icon: SquareCheckIcon },
	{ label: 'Appointments', href: '/appointments', match: '/appointments', icon: StethoscopeIcon },
	{ label: 'Brain Dump', href: '/brain-dump', match: '/brain-dump', icon: BrainIcon },
	{ label: 'Medications', href: '/medications', match: '/medications', icon: PillIcon },
	{ label: 'Media', href: '/media', match: '/media', icon: ClapperboardIcon },
	{ label: 'Last Time', href: '/last-time', match: '/last-time', icon: TimerIcon },
	{ label: 'People', href: '/people', match: '/people', icon: UsersIcon },
	{ label: 'Analytics', href: '/analytics', match: '/analytics', icon: ChartLineIcon }
];

export function hrefOf(item: NavItem): string {
	return typeof item.href === 'function' ? item.href() : item.href;
}

export function isActive(item: NavItem, pathname: string): boolean {
	if (item.match === '/') return pathname === '/';
	return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
