/**
 * App-wide toasts (Ark Toast via moduix). `<ToastToaster toaster={toaster} />`
 * is mounted once in the root layout; call `toast.success(…)` / `toast.error(…)` anywhere.
 */
import { createToaster } from '@ark-ui/svelte/toast';

export const toaster = createToaster({
	placement: 'bottom-end',
	overlap: true,
	gap: 12
});

export const toast = {
	success: (title: string) => toaster.create({ title, type: 'success' }),
	error: (title: string) => toaster.create({ title, type: 'error', duration: 8000 })
};
