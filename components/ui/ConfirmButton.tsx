/**
 * components/ui/ConfirmButton.tsx
 *
 * Two-click confirmation button. First click shows a "Sure?" state;
 * second click executes the action. Optionally shows a Cancel button.
 *
 * Replaces the copy-pasted confirming/setConfirming pattern used in
 * ChartSettings, TaskDetailClient, AppointmentDetailClient, LastTimeSettings.
 *
 * Usage:
 *   <ConfirmButton onConfirm={handleDelete}>✕ Delete</ConfirmButton>
 *   <ConfirmButton onConfirm={handleDelete} confirmLabel="Sure?" variant="danger" size="sm" />
 */

'use client';

import { useState }  from 'react';
import { Button }    from './Button';

interface Props {
  onConfirm:     () => void;
  /** Label shown before the first click. Pass children OR label. */
  children?:     React.ReactNode;
  /** Explicit label prop (alternative to children). */
  label?:        string;
  /** Text shown after first click. Default: 'Sure?' */
  confirmLabel?: string;
  /** Show an explicit Cancel button in confirmed state. Default: true */
  showCancel?:   boolean;
  variant?:      'default' | 'accent' | 'ghost' | 'danger';
  size?:         'default' | 'sm' | 'icon';
  disabled?:     boolean;
  className?:    string;
}

export function ConfirmButton({
  onConfirm,
  children,
  label,
  confirmLabel = 'Sure?',
  showCancel   = true,
  variant      = 'danger',
  size         = 'sm',
  disabled     = false,
  className,
}: Readonly<Props>) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (confirming) {
      setConfirming(false);
      onConfirm();
    } else {
      setConfirming(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={handleClick}
        className={className}
      >
        {confirming ? confirmLabel : (children ?? label ?? '✕')}
      </Button>
      {confirming && showCancel && (
        <Button variant="ghost" size={size} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      )}
    </>
  );
}
