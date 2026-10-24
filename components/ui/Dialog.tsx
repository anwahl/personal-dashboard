'use client';

/**
 * Dialog — modal dialog primitive (Radix implementation).
 *
 * This is the only file that imports Radix's Dialog. Call sites use this
 * wrapper's API, so swapping the underlying library never touches them.
 *
 * Behaviour provided by Radix:
 *   - Focus is trapped inside the panel and returned to the trigger on close
 *   - Esc and clicking the backdrop close the dialog
 *   - Page behind the dialog doesn't scroll
 *   - Rendered in a portal, so ancestor overflow:hidden never clips it
 *   - Exit animation is allowed to finish before unmount (data-state="closed")
 *
 * Placement:
 *   'center' (default) — a centred panel.
 *   'bottom'           — a bottom sheet: full width, slides up from the
 *                        bottom edge, with a grabber and safe-area padding.
 *                        Swipe down to dismiss (useSwipeToDismiss).
 *                        Used by the mobile More / Quick add menus.
 *
 * Layout 'form' (see FormDialog): full screen on phones, a wider centred
 * panel elsewhere; the body scrolls under a fixed header, and clicking
 * outside doesn't close it (so a stray tap can't throw away edits).
 *
 * Usage:
 *   <Dialog open={open} onOpenChange={setOpen} title="Choose icon">
 *     ...content...
 *   </Dialog>
 */

import { useCallback, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Dialog as DialogPrimitive }               from 'radix-ui';
import { Button }                                  from './Button';
import { useSwipeToDismiss }                       from '@/lib/hooks/useSwipeToDismiss';
import { useMediaQuery, PHONE_QUERY }             from '@/lib/hooks/useMediaQuery';

export type DialogSize      = 'sm' | 'md' | 'lg';
export type DialogPlacement = 'center' | 'bottom' | 'auto';

interface DialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  title:         ReactNode;
  /** Optional supporting text, announced by screen readers. */
  description?:  ReactNode;
  /** 'sm' = 320px, 'md' = 480px (default), 'lg' = 640px max. Ignored for 'bottom'. */
  size?:         DialogSize;
  /** 'form': full screen on phones, scrolling body, no close on outside click. */
  layout?:       'default' | 'form';
  /** Shown before the title (e.g. a Cancel button). */
  headerStart?:  ReactNode;
  /** Shown after the title, replacing the ✕ close button (e.g. Save). */
  headerEnd?:    ReactNode;
  /** 'center' (default), 'bottom' for a bottom sheet, or 'auto': a bottom
   *  sheet on phones and centered on wider screens. */
  placement?:    DialogPlacement;
  /** Action row rendered at the bottom of the panel (e.g. Cancel / Save). */
  footer?:       ReactNode;
  /**
   * Element to focus on open — on mouse/trackpad devices only.
   * On touch devices the panel itself is focused instead, so the on-screen
   * keyboard doesn't pop up and cover the dialog.
   */
  desktopFocusRef?: RefObject<HTMLElement | null>;
  children:      ReactNode;
}

function hasFinePointer(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  placement = 'center',
  layout = 'default',
  headerStart,
  headerEnd,
  footer,
  desktopFocusRef,
  children,
}: Readonly<DialogProps>) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // The panel mounts after the dialog does, so swipe handling needs the
  // element itself (via this callback ref), not just the ref object.
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const attachPanel = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    setPanelEl(el);
  }, []);
  const isPhone    = useMediaQuery(PHONE_QUERY);
  const isForm     = layout === 'form';
  const isFull     = isForm && isPhone;
  const isSheet    = !isForm && (placement === 'bottom' || (placement === 'auto' && isPhone));
  const panelClass = [
    'modal-panel',
    isSheet ? 'modal-panel--sheet' : null,
    isForm  ? 'modal-panel--form'  : null,
    isFull  ? 'modal-panel--full'  : null,
    !isSheet && !isFull && size !== 'md' ? `modal-panel--${size}` : null,
  ].filter(Boolean).join(' ');
  const overlayClass = [
    'modal-overlay',
    isSheet ? 'modal-overlay--sheet' : null,
    isFull  ? 'modal-overlay--full'  : null,
  ].filter(Boolean).join(' ');

  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  useSwipeToDismiss(panelEl, {
    enabled:        isSheet && open,
    onDismiss:      dismiss,
    handleSelector: '.modal-panel__grabber, .modal-panel__header',
  });

  // Radix warns if there is no Description unless aria-describedby is
  // explicitly undefined.
  const describedBy = description ? {} : { 'aria-describedby': undefined };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClass}>
          <DialogPrimitive.Content
            ref={attachPanel}
            className={panelClass}
            {...describedBy}
            onInteractOutside={isForm ? e => e.preventDefault() : undefined}
            onOpenAutoFocus={e => {
              e.preventDefault();
              const target = hasFinePointer() ? desktopFocusRef?.current : null;
              (target ?? panelRef.current)?.focus();
            }}
          >
            {isSheet && <div className="modal-panel__grabber" aria-hidden="true" />}
            <div className="modal-panel__header">
              {headerStart}
              <DialogPrimitive.Title className="modal-panel__title">
                {title}
              </DialogPrimitive.Title>
              {headerEnd ?? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  onClick={() => onOpenChange(false)}
                >
                  ✕
                </Button>
              )}
            </div>

            {description && (
              <DialogPrimitive.Description className="modal-panel__description">
                {description}
              </DialogPrimitive.Description>
            )}

            <div className="modal-panel__body">{children}</div>

            {footer && <div className="modal-panel__footer">{footer}</div>}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
