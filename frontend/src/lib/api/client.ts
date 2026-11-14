import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema.d.ts';

/** Thrown for any non-2xx response, so TanStack Query sees it as an error. */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly body: unknown
	) {
		const message =
			body && typeof body === 'object' && 'error' in body ? String(body.error) : `HTTP ${status}`;
		super(message);
	}
}

// The backend answers /api/* with 401 instead of redirecting; logging in is a
// full-page navigation through Authelia that comes back to where we were.
const redirectOnUnauthorized: Middleware = {
	onResponse({ response }) {
		if (response.status === 401) {
			const next = location.pathname + location.search;
			location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
		}
	}
};

export const api = createClient<paths>({ baseUrl: '' });
api.use(redirectOnUnauthorized);

/** Unwraps an openapi-fetch result: returns `data`, or throws `ApiError`. */
export async function unwrap<T>(
	result: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<T> {
	const { data, error, response } = await result;
	if (!response.ok) throw new ApiError(response.status, error);
	return data as T;
}
