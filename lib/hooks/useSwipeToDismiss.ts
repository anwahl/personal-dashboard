'use client';

/**
 * useSwipeToDismiss — drag a bottom sheet down to close it.
 *
 * Pass the sheet panel element (from a callback ref / state, since dialog
 * content mounts after the dialog itself). A drag may start:
 *   - on the drag handle area (`handleSelector`) at any time, or
 *   - anywhere else in the panel while its content is scrolled to the top,
 * so swiping down inside a scrolled list still just scrolls it. Drags that
 * start on a form field (typing, selecting text) are ignored.
 *
 * The panel follows the finger downward. On release it dismisses if pulled
 * past `threshold` of its height or flicked down quickly; otherwise it
 * springs back. On dismiss the current offset is left in the CSS variable
 * --sheet-drag-offset so the exit animation can continue from where the
 * finger let go.
 *
 * Uses touch events (not pointer events) because only a non-passive
 * touchmove listener can cancel the browser's own scrolling once a drag
 * has begun.
 */

import { useEffect } from 'react';

interface Options {
  enabled:         boolean;
  onDismiss:       () => void;
  /** Elements that always start a drag (e.g. the grabber and header). */
  handleSelector?: string;
  /** Fraction of the panel height that dismisses on release. */
  threshold?:      number;
}

/** Downward speed (px/ms) that counts as a flick. */
const FLICK_VELOCITY = 0.5;
/** Movement (px) before deciding whether this touch is a drag. */
const DECIDE_DISTANCE = 6;
const SPRING_BACK = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)';
const FORM_FIELDS = 'input, textarea, select, [contenteditable="true"]';

export function useSwipeToDismiss(
  panel: HTMLElement | null,
  { enabled, onDismiss, handleSelector, threshold = 0.25 }: Options,
) {
  useEffect(() => {
    if (!enabled || !panel) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let offset = 0;
    let state: 'idle' | 'pending' | 'dragging' = 'idle';

    const setOffset = (px: number) => {
      offset = px;
      panel.style.transform = px > 0 ? `translateY(${px}px)` : '';
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as Element;
      if (target.closest(FORM_FIELDS)) return;

      const onHandle = handleSelector ? !!target.closest(handleSelector) : false;
      if (!onHandle && panel.scrollTop > 0) return;

      startX    = e.touches[0].clientX;
      startY    = e.touches[0].clientY;
      startTime = e.timeStamp;
      state     = 'pending';
      panel.style.transition = '';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (state === 'idle') return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (state === 'pending') {
        if (Math.abs(dx) < DECIDE_DISTANCE && Math.abs(dy) < DECIDE_DISTANCE) return;
        // Upward or sideways first move: let the browser scroll as normal.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { state = 'idle'; return; }
        state = 'dragging';
      }

      e.preventDefault();          // stop the page/sheet from scrolling
      setOffset(Math.max(0, dy));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (state !== 'dragging') { state = 'idle'; return; }
      state = 'idle';

      const elapsed  = Math.max(1, e.timeStamp - startTime);
      const velocity = offset / elapsed;
      const dismiss  = offset > panel.offsetHeight * threshold || velocity > FLICK_VELOCITY;

      if (dismiss) {
        panel.style.setProperty('--sheet-drag-offset', `${offset}px`);
        onDismiss();
        return;
      }

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.style.transition = reduceMotion ? '' : SPRING_BACK;
      setOffset(0);
    };

    panel.addEventListener('touchstart',  onTouchStart, { passive: true });
    panel.addEventListener('touchmove',   onTouchMove,  { passive: false });
    panel.addEventListener('touchend',    onTouchEnd);
    panel.addEventListener('touchcancel', onTouchEnd);

    return () => {
      panel.removeEventListener('touchstart',  onTouchStart);
      panel.removeEventListener('touchmove',   onTouchMove);
      panel.removeEventListener('touchend',    onTouchEnd);
      panel.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [panel, enabled, onDismiss, handleSelector, threshold]);
}
