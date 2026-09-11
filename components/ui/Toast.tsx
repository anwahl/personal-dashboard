'use client';

/**
 * Global toast notification system.
 *
 * ToastProvider is rendered once in ClientConfig (via app/layout.tsx).
 * Any client component can call useToast() to fire a notification.
 *
 * Usage:
 *   const { addToast } = useToast();
 *   addToast('Saved successfully!', 'success');
 *   addToast('Failed to load medications', 'error');
 *   addToast('Loading data…', 'info');          // default variant
 */

import {
  createContext, useCallback, useContext,
  useState, type ReactNode,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  ALERT: 'alert',
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info'
} as const;

export type NotificationVariantType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

interface ToastItem {
  id:      string;
  message: string;
  variant: NotificationVariantType;
}

interface ToastContextValue {
  addToast: (message: string, variant?: NotificationVariantType) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

const TOAST_DURATION_MS = 6000;

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((
      message: string, variant: NotificationVariantType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(ts => [...ts, { id, message, variant }]);
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <Notification key={toast.id} variant={toast.variant} message={toast.message} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/** Returns addToast. Call this in any Client Component. */
export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}


export function Notification({ message, variant = NOTIFICATION_TYPES.INFO, className, onDismiss: doDismiss }:
    Readonly<{ message: string; variant?: NotificationVariantType; className?: string; onDismiss: () => void; }>) {
  const classes = [`notification notification__${variant}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      {message}
      <button
        type='button'
        className="notification__dismiss"
        onClick={doDismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </span>
  );
}