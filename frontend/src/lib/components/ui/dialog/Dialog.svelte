<script module lang="ts">
  import type { DialogRootProps as ArkDialogRootProps } from '@ark-ui/svelte/dialog';
  import type { OverlayPortalProps } from '#lib/moduix/overlayPortal/index.ts';

  export interface DialogRootProps extends ArkDialogRootProps, OverlayPortalProps {}
</script>

<script lang="ts">
  import { Root as DialogRoot } from '@ark-ui/svelte/dialog';
  import { OverlayPortalProvider } from '#lib/moduix/overlayPortal/index.ts';

  let {
    lazyMount = true,
    open = $bindable(),
    portalled = true,
    portalRef,
    unmountOnExit = true,
    ...props
  }: DialogRootProps = $props();
</script>

<OverlayPortalProvider {portalled} {portalRef}>
  <DialogRoot {...props} bind:open {lazyMount} {unmountOnExit} />
</OverlayPortalProvider>