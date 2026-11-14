import { QueryClient } from '@tanstack/svelte-query';
import type { LayoutLoad } from './$types';

// Client-side rendering only; the backend is a separate API.
export const ssr = false;
export const prerender = false;

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 30_000 }
	}
});

export const load: LayoutLoad = () => ({ queryClient });
