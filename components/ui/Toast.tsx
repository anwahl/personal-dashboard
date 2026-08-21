'use client';

/**
 * components/ui/Toast.tsx
 *
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

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id:      string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  // Safe no-op default — components that call useToast() outside a provider
  // won't crash, they just won't show toasts.
  addToast: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

const TOAST_DURATION_MS = 4500;

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = crypto.randomUUID();
    setToasts(ts => [...ts, { id, message, variant }]);
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast--${toast.variant}`} role="alert">
            <span className="toast__message">{toast.message}</span>
            <button
              className="toast__dismiss"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
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
