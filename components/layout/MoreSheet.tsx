'use client';

/**
 * MoreSheet — every page that isn't on the mobile tab bar, grouped by
 * section (lib/constants/nav.ts → MORE_SECTIONS), with Settings last.
 */

import {
  BookOpen, Brain, ChartLine, ChevronRight, Clapperboard, Pill, Settings,
  SquareCheck, Stethoscope, Timer, Users, type LucideIcon,
} from 'lucide-react';
import { Button, CardGridRow, CardSection, CardSectionLabel, Dialog } from '@/components/ui';
import { MORE_SECTIONS, type MoreIconKey, type MoreItem } from '@/lib/constants/nav';

const ICONS: Record<MoreIconKey, LucideIcon> = {
  'tasks':          SquareCheck,
  'appointments':   Stethoscope,
  'medications':    Pill,
  'analytics':      ChartLine,
  'brain-dump':     Brain,
  'media':          Clapperboard,
  'last-time':      Timer,
  'people':         Users,
  'weekly-journal': BookOpen,
};

const TILES_PER_ROW = 3;

function toRows(items: MoreItem[]): MoreItem[][] {
  return Array.from({ length: Math.ceil(items.length / TILES_PER_ROW) }, (_, i) =>
    items.slice(i * TILES_PER_ROW, (i + 1) * TILES_PER_ROW));
}

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoreSheet({ open, onOpenChange }: Readonly<Props>) {
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="More" placement="bottom">
      {MORE_SECTIONS.map(section => (
        <CardSection key={section.title}>
          <CardSectionLabel>{section.title}</CardSectionLabel>
          {toRows(section.items).map((row, i) => (
            <CardGridRow key={i}>
              {row.map(item => {
                const Icon = ICONS[item.icon];
                return (
                  <Button key={item.href} href={item.href} variant="tile" onClick={close}>
                    <Icon size={26} strokeWidth={1.8} aria-hidden="true" />
                    {item.label}
                  </Button>
                );
              })}
            </CardGridRow>
          ))}
        </CardSection>
      ))}

      <Button href="/settings" variant="tile-row" full onClick={close}>
        <Settings size={22} strokeWidth={1.8} aria-hidden="true" />
        Settings
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
    </Dialog>
  );
}
