import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode, useState } from 'react';
import Link from 'next/link';

type Variant = 'default' | 'accent' | 'ghost' | 'action' | 'action-alt' | 'action-del' | 'danger';
type Size    = 'default' | 'sm' | 'icon' | 'check';

interface BaseProps {
  variant?: Variant;
  size?:    Size;
  full?:    boolean;
  children: ReactNode;
  className?: string;
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps   = BaseProps & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>;

type Props = ButtonProps | LinkProps;

function buildClassName(variant: Variant, size: Size, full: boolean, extra?: string): string {
  const classes = ['btn'];
  if (variant !== 'default') classes.push(`btn--${variant}`);
  if (size !== 'default')    classes.push(`btn--${size}`);
  if (full)                  classes.push('btn--full');
  if (extra)                 classes.push(extra);
  return classes.join(' ');
}

export function Button(props: Props) {
  const { variant = 'default', size = 'default', full = false, children, className, ...rest } = props;
  const cls = buildClassName(variant, size, full, className);

  if ('href' in props && props.href) {
    const { href, ...anchorRest } = rest as LinkProps;
    return <Link href={href} className={cls} {...(anchorRest as object)}>{children}</Link>;
  }

  return (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
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