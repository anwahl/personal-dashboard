'use client';

import { Tabs } from 'radix-ui';

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
  /** Accessible name for the tab list (e.g. "Task lists"). */
  label?:   string;
}

/**
 * TabBar — a row of tabs (Radix Tabs). The caller renders the active tab's
 * content itself, below the bar.
 *
 * Radix gives it tab semantics (role="tablist"/"tab", aria-selected) and
 * keyboard support: ←/→ move between tabs, Home/End jump to the ends.
 */
export function TabBar<T extends string>({ tabs, active, onChange, label }: Readonly<TabBarProps<T>>) {
  return (
    <Tabs.Root value={active} onValueChange={v => onChange(v as T)}>
      <Tabs.List className="tab-bar" aria-label={label}>
        {tabs.map(tab => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className={`tab${active === tab.id ? ' tab--active' : ''}`}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
