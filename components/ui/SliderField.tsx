'use client';

/**
 * SliderField — a labelled slider with its current value shown on the right
 * ("–" until it's set).
 *
 *   <SliderField emoji="💧" label="Water" value={oz} min={0} max={80} step={1} onChange={setOz} />
 *
 * Built on the native range input on purpose: on iOS it only moves when you
 * drag the thumb, so swiping down a page full of sliders scrolls instead of
 * changing values (custom sliders such as Radix's jump to wherever the
 * finger lands). Arrow keys move by `step`.
 */

import type { CSSProperties } from 'react';

interface Props {
  emoji:    React.ReactNode;
  label:    string;
  value:    number | null;
  min?:     number;
  max?:     number;
  /** Increment, e.g. 0.5 for half hours. Default 1. */
  step?:    number;
  onChange: (value: number) => void;
}

export function SliderField({ emoji, label, value, min = 0, max = 10, step = 1, onChange }: Readonly<Props>) {
  const v   = value ?? min;
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;

  return (
    <div className="slider-field">
      <div className="slider-field__header">
        <span className="slider-field__emoji">{emoji}</span>
        <span className="slider-field__label">{label}</span>
        <span className={`slider-field__value${value == null ? ' slider-field__value--empty' : ''}`}>
          {value ?? '–'}
        </span>
      </div>
      <input
        type="range"
        className="slider-field__range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={v}
        // The filled part of the track (a dynamic value, so an inline style).
        style={{ '--slider-fill': `${pct}%` } as CSSProperties}
        onChange={e => onChange(Number.parseFloat(e.target.value))}
      />
    </div>
  );
}
