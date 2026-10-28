'use client';

import { type ComponentPropsWithRef, type AnchorHTMLAttributes, type ReactNode, useState } from 'react';
import Link from 'next/link';

type Variant =
  | 'default' | 'primary' | 'ghost' | 'action' | 'action-alt' | 'danger'
  /** Secondary action: inline save / add / apply. `primary` is a page's main action. */
  | 'secondary'
  /** Square-ish tile, icon above label (menu grids). */
  | 'tile'
  /** Full-width row, icon beside label (menu lists). */
  | 'tile-row'
  /** Bottom tab-bar item, icon above label. Active via aria-current="page" or data-active. */
  | 'nav';
type Size    =
  | 'default' | 'sm' | 'icon' | 'check'
  /** Small square icon button (e.g. ‹ › month nav): 28px with a mouse, 44px on touch. */
  | 'compact';

interface BaseProps {
  variant?: Variant;
  size?:    Size;
  full?:    boolean;
  /**
   * Work in progress (saving, adding…): shows a spinner beside the label,
   * disables the button and sets aria-busy. The button keeps its width.
   * Icon-size buttons show the spinner in place of the icon.
   */
  busy?:    boolean;
  /** Optional only for check-size buttons, which have no label. */
  children?: ReactNode;
  className?: string;
}

// ComponentPropsWithRef so a ref can reach the <button> (e.g. a drag handle or menu trigger).
type ButtonProps = BaseProps & ComponentPropsWithRef<'button'> & { href?: undefined };
type LinkProps   = BaseProps & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>;

type Props = ButtonProps | LinkProps;

function buildClassName(variant: Variant, size: Size, full: boolean, busy: boolean, extra?: string): string {
  const classes = ['btn'];
  if (variant !== 'default') classes.push(`btn--${variant}`);
  if (size !== 'default')    classes.push(`btn--${size}`);
  if (full)                  classes.push('btn--full');
  if (busy)                  classes.push('btn--busy');
  if (extra)                 classes.push(extra);
  return classes.join(' ');
}

export function Button(props: Props) {
  const { variant = 'default', size = 'default', full = false, busy = false, children, className, ...rest } = props;

  if ('href' in props && props.href) {
    const { href, ...anchorRest } = rest as LinkProps;
    const cls = buildClassName(variant, size, full, false, className);
    return <Link href={href} className={cls} {...(anchorRest as object)}>{children}</Link>;
  }

  const { disabled, ...buttonRest } = rest as ComponentPropsWithRef<'button'>;
  const cls = buildClassName(variant, size, full, busy, className);
  return (
    // type="button" unless asked otherwise, so buttons inside a <form>
    // (e.g. FormDialog) don't submit it.
    <button type="button" className={cls} disabled={disabled || busy} aria-busy={busy || undefined} {...buttonRest}>
      {busy && <span className="btn__spinner" aria-hidden="true" />}
      {size === 'icon' && busy ? <span className="btn__label--hidden">{children}</span> : children}
    </button>
  );
}


interface ConfirmProps {
  onConfirm:     () => void;
  /** Label shown before the first click. Pass children OR label. */
  children?:     React.ReactNode;
  /** Explicit label prop (alternative to children). */
  label?:        string;
  /** Text shown after first click. Default: 'Sure?' */
  confirmLabel?: string;
  /** Show an explicit Cancel button in confirmed state. Default: true */
  showCancel?:   boolean;
  variant?:      Variant;
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
}: Readonly<ConfirmProps>) {
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