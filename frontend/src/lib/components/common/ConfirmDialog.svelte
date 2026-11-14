<script lang="ts">
	/** The app's one confirm dialog (see `#lib/confirm.svelte.ts`). Mounted once in the root layout. */
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogBackdrop,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogPositioner,
		DialogTitle
	} from '#lib/components/ui/dialog/index.js';
	import { confirmState, settleConfirm } from '#lib/confirm.svelte.ts';

	const current = $derived(confirmState.current);
</script>

<Dialog
	role="alertdialog"
	open={current !== null}
	onOpenChange={(d) => {
		if (!d.open) settleConfirm(false);
	}}
>
	<DialogBackdrop />
	<DialogPositioner>
		<DialogContent size="sm">
			{#if current}
				<DialogHeader>
					<DialogTitle>{current.title}</DialogTitle>
					{#if current.description}
						<DialogDescription>{current.description}</DialogDescription>
					{/if}
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onclick={() => settleConfirm(false)}>
						{current.cancelLabel ?? 'Cancel'}
					</Button>
					<Button variant={current.destructive ? 'destructive' : 'default'} onclick={() => settleConfirm(true)}>
						{current.confirmLabel ?? 'Confirm'}
					</Button>
				</DialogFooter>
			{/if}
		</DialogContent>
	</DialogPositioner>
</Dialog>
