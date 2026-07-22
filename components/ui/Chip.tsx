import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?:    boolean;
  small?:     boolean;
  children:   ReactNode;
  className?: string;
}

export function Chip({ active = false, small = false, children, className, ...rest }: Readonly<Props>) {
  const classes = ['chip'];
  if (active) classes.push('chip--active');
  if (small)  classes.push('chip--sm');
  if (className) classes.push(className);

  return (
    <button type="button" className={classes.join(' ')} {...rest}>
      {children}
    </button>
  );
}

/** Convenience wrapper for a group of chips */
export function ChipGroup({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={['chip-group', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
