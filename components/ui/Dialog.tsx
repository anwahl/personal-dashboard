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
 * Usage:
 *   <Dialog open={open} onOpenChange={setOpen} title="Choose icon">
 *     ...content...
 *   </Dialog>
 */

import { useRef, type ReactNode, type RefObject } from 'react';
import { Dialog as DialogPrimitive }               from 'radix-ui';
import { Button }                                  from './Button';

export type DialogSize = 'sm' | 'md';

interface DialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  title:         ReactNode;
  /** Optional supporting text, announced by screen readers. */
  description?:  ReactNode;
  /** 'sm' = 320px max, 'md' = 480px max (default). */
  size?:         DialogSize;
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
  footer,
  desktopFocusRef,
  children,
}: Readonly<DialogProps>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const panelClass = ['modal-panel', size === 'md' ? null : `modal-panel--${size}`]
    .filter(Boolean)
    .join(' ');

  // Radix warns if there is no Description unless aria-describedby is
  // explicitly undefined.
  const describedBy = description ? {} : { 'aria-describedby': undefined };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay">
          <DialogPrimitive.Content
            ref={panelRef}
            className={panelClass}
            {...describedBy}
            onOpenAutoFocus={e => {
              e.preventDefault();
              const target = hasFinePointer() ? desktopFocusRef?.current : null;
              (target ?? panelRef.current)?.focus();
            }}
          >
            <div className="modal-panel__header">
              <DialogPrimitive.Title className="modal-panel__title">
                {title}
              </DialogPrimitive.Title>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
              >
                ✕
              </Button>
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
