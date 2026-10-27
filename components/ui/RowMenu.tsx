'use client';

/**
 * RowMenu — the ⋯ actions menu on list rows (Radix DropdownMenu).
 *
 * Keyboard and screen-reader accessible, and rendered in a portal so a
 * parent with overflow: hidden can't clip it.
 *
 * Items:
 *   { label, onSelect }                      a plain action
 *   { label, onSelect, destructive: true }   needs a second tap to confirm
 *                                            (same idea as ConfirmButton)
 *   { label, submenu: [...] }                a nested menu (e.g. "Move to ▸")
 *   'separator'                              a divider
 *
 * Usage:
 *   <RowMenu label="Water" items={[
 *     { label: 'Edit', onSelect: startEdit },
 *     'separator',
 *     { label: 'Delete', onSelect: remove, destructive: true },
 *   ]} />
 */

import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { Check, ChevronRight, Ellipsis } from 'lucide-react';
import { Button } from './Button';

export interface RowMenuAction {
  label:        string;
  onSelect:     () => void;
  /** Requires a second tap ("Tap again to delete") before onSelect runs. */
  destructive?: boolean;
  /** Shows a check mark (e.g. the current category in "Move to"). */
  checked?:     boolean;
  disabled?:    boolean;
}

interface RowMenuSubmenu {
  label:   string;
  submenu: RowMenuAction[];
}

export type RowMenuItem = RowMenuAction | RowMenuSubmenu | 'separator';

interface RowMenuProps {
  items: RowMenuItem[];
  /** What the menu acts on, for the trigger's accessible name ("Actions for Water"). */
  label: string;
}

export function RowMenu({ items, label }: Readonly<RowMenuProps>) {
  // The destructive item awaiting its confirming second tap, if any.
  const [confirming, setConfirming] = useState<string | null>(null);

  const renderAction = (item: RowMenuAction) => {
    const isConfirming = confirming === item.label;
    const className = [
      'row-menu__item',
      item.destructive ? 'row-menu__item--destructive' : null,
    ].filter(Boolean).join(' ');

    return (
      <DropdownMenu.Item
        key={item.label}
        className={className}
        disabled={item.disabled}
        onSelect={e => {
          if (item.destructive && !isConfirming) {
            e.preventDefault();          // keep the menu open for the second tap
            setConfirming(item.label);
            return;
          }
          item.onSelect();
        }}
      >
        <span className="row-menu__check" aria-hidden="true">
          {item.checked && <Check size={16} />}
        </span>
        {isConfirming ? `Tap again to ${item.label.toLowerCase()}` : item.label}
      </DropdownMenu.Item>
    );
  };

  return (
    <DropdownMenu.Root onOpenChange={open => { if (!open) setConfirming(null); }}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${label}`}>
          <Ellipsis size={20} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="row-menu" align="end" sideOffset={4} collisionPadding={8}>
          {items.map((item, i) => {
            if (item === 'separator') {
              return <DropdownMenu.Separator key={`sep-${i}`} className="row-menu__separator" />;
            }
            if ('submenu' in item) {
              return (
                <DropdownMenu.Sub key={item.label}>
                  <DropdownMenu.SubTrigger className="row-menu__item">
                    <span className="row-menu__check" aria-hidden="true" />
                    {item.label}
                    <ChevronRight size={16} className="row-menu__chevron" aria-hidden="true" />
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent className="row-menu" sideOffset={4} collisionPadding={8}>
                      {item.submenu.map(renderAction)}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>
              );
            }
            return renderAction(item);
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
