/**
 * One app-wide confirm dialog. `await confirm({ … })` resolves true when the
 * person confirms, false when they cancel or dismiss it.
 * Rendered by `ConfirmDialog.svelte`, mounted once in the root layout.
 */

export interface ConfirmOptions {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** Red confirm button (deleting, discarding). */
	destructive?: boolean;
}

interface Pending extends ConfirmOptions {
	resolve: (ok: boolean) => void;
}

export const confirmState = $state<{ current: Pending | null }>({ current: null });

export function confirm(options: ConfirmOptions): Promise<boolean> {
	confirmState.current?.resolve(false);
	return new Promise((resolve) => {
		confirmState.current = { ...options, resolve };
	});
}

export function settleConfirm(ok: boolean) {
	const pending = confirmState.current;
	confirmState.current = null;
	pending?.resolve(ok);
}
