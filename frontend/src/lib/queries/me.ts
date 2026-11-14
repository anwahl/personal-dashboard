import { queryOptions } from '@tanstack/svelte-query';
import { api, unwrap } from '../api/client.ts';

export const meQuery = () =>
	queryOptions({
		queryKey: ['me'],
		queryFn: () => unwrap(api.GET('/api/me')),
		staleTime: Infinity
	});
