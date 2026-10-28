import type { ReactNode } from 'react';
import { Button } from './Button';

/**
 * PrevNextNav — ‹ label › : step back and forward through days, weeks, months.
 *
 * Each step is a link (`{ href }`, changes the page) or an action
 * (`{ onClick }`, changes content in place, e.g. a placed module).
 *
 *   <PrevNextNav label="Week 43 · Oct 19–25"
 *     prev={{ href: '/journal/weekly/2026-10-12', label: 'Previous week' }}
 *     next={{ onClick: nextWeek,                  label: 'Next week' }} />
 *
 * `compact` is the small version (e.g. the side calendar's month).
 */

export type PrevNextStep =
  | { href: string; onClick?: undefined; label: string }
  | { onClick: () => void; href?: undefined; label: string };

function StepButton({ step, compact, children }: Readonly<{
  step: PrevNextStep; compact: boolean; children: ReactNode;
}>) {
  const common = {
    variant:      'ghost' as const,
    size:         compact ? 'compact' as const : 'icon' as const,
    className:    'prev-next-nav__step',
    'aria-label': step.label,
  };
  return step.href !== undefined
    ? <Button {...common} href={step.href}>{children}</Button>
    : <Button {...common} onClick={step.onClick}>{children}</Button>;
}

export function PrevNextNav({
  label, navLabel, prev, next, compact = false, className,
}: Readonly<{
  /** What's shown between the arrows (text, or a heading). */
  label:      ReactNode;
  /** Accessible name for the nav (e.g. "Day navigation"). */
  navLabel?:  string;
  prev:       PrevNextStep;
  next:       PrevNextStep;
  compact?:   boolean;
  className?: string;
}>) {
  const classes = ['prev-next-nav', compact && 'prev-next-nav--compact', className].filter(Boolean).join(' ');
  return (
    <nav className={classes} aria-label={navLabel}>
      <StepButton step={prev} compact={compact}>‹</StepButton>
      <div className="prev-next-nav__label">{label}</div>
      <StepButton step={next} compact={compact}>›</StepButton>
    </nav>
  );
}
