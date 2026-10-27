'use client';

/**
 * SliderField — a labelled slider with its current value shown on the right
 * ("–" until it's set).
 *
 *   <SliderField emoji="💧" label="Water" value={oz} min={0} max={80} step={1} onChange={setOz} />
 *
 * Built on Radix Slider: touching anywhere on the track jumps the knob there
 * (a native range input on iOS only moves when you drag the knob itself).
 * Vertical swipes still scroll the page (`touch-action: pan-y`). Arrow keys
 * move by `step`; Page Up/Down by ten steps; Home/End to the ends.
 */

import { Slider } from 'radix-ui';

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
  return (
    <div className="slider-field">
      <div className="slider-field__header">
        <span className="slider-field__emoji">{emoji}</span>
        <span className="slider-field__label">{label}</span>
        <span className={`slider-field__value${value == null ? ' slider-field__value--empty' : ''}`}>
          {value ?? '–'}
        </span>
      </div>
      <Slider.Root
        className={`slider-field__root${value == null ? ' slider-field__root--empty' : ''}`}
        min={min}
        max={max}
        step={step}
        value={[value ?? min]}
        onValueChange={([v]) => onChange(v)}
      >
        <Slider.Track className="slider-field__track">
          <Slider.Range className="slider-field__fill" />
        </Slider.Track>
        <Slider.Thumb className="slider-field__thumb" aria-label={label} />
      </Slider.Root>
    </div>
  );
}
