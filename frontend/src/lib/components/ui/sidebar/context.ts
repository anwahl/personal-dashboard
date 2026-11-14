import { getContext, setContext } from 'svelte';

export type SidebarSide = 'left' | 'right';

export interface SidebarConfig {
	side: () => SidebarSide;
	collapsed: () => boolean;
	setCollapsed: (collapsed: boolean) => void;
}

const defaultSidebarConfig: SidebarConfig = {
	side: () => 'left',
	collapsed: () => false,
	setCollapsed: () => {}
};

const sidebarContextKey = Symbol('SidebarContext');

export const provideSidebarContext = (config: SidebarConfig) => setContext(sidebarContextKey, config);

export const useSidebarConfig = () =>
	getContext<SidebarConfig | undefined>(sidebarContextKey) ?? defaultSidebarConfig;

export const useSidebar = () => {
	const config = useSidebarConfig();

	return {
		get collapsed() {
			return config.collapsed();
		},
		get side() {
			return config.side();
		},
		get state() {
			return this.collapsed ? 'collapsed' : 'expanded';
		},
		toggleSidebar: () => config.setCollapsed(!config.collapsed())
	};
};
