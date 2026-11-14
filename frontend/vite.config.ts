import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Dev: everything the backend owns goes through this origin, so the auth cookie
// and the OIDC callback both live on localhost:5173.
const backend = 'http://localhost:3000';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// SPA: nothing is prerendered; every unknown path is served 200.html.
			adapter: adapter({ fallback: '200.html' })
		})
	],
	server: {
		proxy: {
			'/api': backend,
			'/auth': backend,
			'/openapi.json': backend
		}
	}
});
