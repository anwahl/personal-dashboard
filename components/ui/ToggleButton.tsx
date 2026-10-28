'use client';

/**
 * ToggleButton — a button that stays on or off (habit tiles, "taken" rows).
 * ToggleGroup — a set of them where one may be on (a multiple-choice answer).
 *
 *   <ToggleButton appearance="tile" pressed={done}
 *     onPressedChange={() => toggle(id)} readOnly={mode === 'view'}>
 *     <IconDisplay … className="toggle-btn__icon" />
 *     <span className="toggle-btn__label">{name}</span>
 *   </ToggleButton>
 *
 *   <ToggleGroup appearance="answer" label={question}
 *     value={selected} onValueChange={v => answer(id, v)}
 *     options={opts.map(o => ({ value: o.id, label: <>…</> }))} />
 *
 * Appearances:
 *   tile    icon above label; on = done (success)
 *   row     full-width row with a round check before it; on = done (success)
 *   answer  value above label; on = selected
 * Children use the `toggle-btn__*` part classes for their pieces
 * (icon, label, title, meta, value).
 *
 * `readOnly` draws the same look without a button (view mode).
 * The on state is exposed as data-state="on" | "off" and aria-pressed.
 * Props follow Radix Toggle / ToggleGroup (pressed / onPressedChange,
 * type="single" value / onValueChange).
 */

import type { ReactNode } from 'react';

type Appearance = 'tile' | 'row' | 'answer';

export function ToggleButton({
  appearance, pressed, onPressedChange, readOnly, muted, className, children,
}: Readonly<{
  appearance:       Appearance;
  pressed:          boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Show the state without being pressable (view mode). */
  readOnly?:        boolean;
  /** Dimmed (e.g. not taken, in view mode). */
  muted?:           boolean;
  className?:       string;
  children:         ReactNode;
}>) {
  const cls = [
    'toggle-btn', `toggle-btn--${appearance}`,
    muted && 'toggle-btn--muted', readOnly && 'toggle-btn--readonly', className,
  ].filter(Boolean).join(' ');
  const state = pressed ? 'on' : 'off';
  const body = (
    <>
      {appearance === 'row' && <span className="toggle-btn__check" aria-hidden="true">{pressed && '✓'}</span>}
      {appearance === 'row' ? <span className="toggle-btn__body">{children}</span> : children}
    </>
  );

  if (readOnly) return <div className={cls} data-state={state}>{body}</div>;
  return (
    <button type="button" className={cls} data-state={state} aria-pressed={pressed}
      onClick={() => onPressedChange?.(!pressed)}>
      {body}
    </button>
  );
}

export function ToggleGroup<V extends string | number>({
  appearance, label, value, onValueChange, options, className,
}: Readonly<{
  appearance:    Appearance;
  /** Accessible name for the group (e.g. the question). */
  label:         string;
  /** The option that's on, or null for none. */
  value:         V | null | undefined;
  /** Pressing the option that's on turns it off (null). */
  onValueChange: (value: V | null) => void;
  options:       readonly { value: V; label: ReactNode }[];
  className?:    string;
}>) {
  return (
    <div role="group" aria-label={label}
      className={['toggle-group', `toggle-group--${appearance}`, className].filter(Boolean).join(' ')}>
      {options.map(o => (
        <ToggleButton key={o.value} appearance={appearance} pressed={value === o.value}
          onPressedChange={on => onValueChange(on ? o.value : null)}>
          {o.label}
        </ToggleButton>
      ))}
    </div>
  );
}
