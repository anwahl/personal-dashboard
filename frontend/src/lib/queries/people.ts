import { queryOptions } from '@tanstack/svelte-query';
import { api, unwrap } from '#lib/api/client.ts';

/** Active people, for pickers. */
export const peopleQuery = () =>
	queryOptions({
		queryKey: ['people'],
		queryFn: () => unwrap(api.GET('/api/people')),
		staleTime: 5 * 60_000
	});
