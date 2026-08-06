'use client';

// ── Toggle ────────────────────────────────────────────────────────────────────

interface ToggleProps {
  label:    string;
  checked:  boolean;
  onChange: () => void;
  id?:      string;
}

export function Toggle({ label, checked, onChange, id }: Readonly<ToggleProps>) {
  const inputId = id ?? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="toggle-row">
      <label htmlFor={inputId} className="toggle-row__label">{label}</label>
      <div className="toggle">
        <input
          id={inputId}
          type="checkbox"
          className="toggle__input"
          checked={checked}
          onChange={onChange}
        />
        <span className="toggle__track" onClick={onChange} />
      </div>
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────

interface TabDef {
  id:    string;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs:     readonly TabDef[];
  active:   T;
  onChange: (id: T) => void;
}

export function TabBar<T extends string>({ tabs, active, onChange }: Readonly<TabBarProps<T>>) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`tab${active === tab.id ? ' tab--active' : ''}`}
          onClick={() => onChange(tab.id as T)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
