'use client';

interface Props {
  emoji:    string;
  label:    string;
  value:    number | null;
  min?:     number;
  max?:     number;
  onChange: (value: number) => void;
}

export function SliderField({ emoji, label, value, min = 0, max = 10, onChange }: Props) {
  const v   = value ?? min;
  const pct = ((v - min) / (max - min)) * 100;

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
        min={min}
        max={max}
        value={v}
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) 0%)`,
        }}
        onChange={e => onChange(parseInt(e.target.value, 10))}
      />
    </div>
  );
}
