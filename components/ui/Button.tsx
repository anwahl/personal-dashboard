import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

type Variant = 'default' | 'accent' | 'ghost' | 'danger';
type Size    = 'default' | 'sm' | 'icon';

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
