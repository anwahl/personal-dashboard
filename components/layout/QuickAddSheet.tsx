'use client';

/**
 * QuickAddSheet — opened from the ＋ on the mobile tab bar.
 *
 *   Quick task    — QuickAddTaskForm (minimal), the same form as the Tasks page
 *   Brain dump    — BrainDumpForm (bare), the same form as the Brain Dump page
 *   Log something — shortcuts into Today's tabs (?tab=…, read by DailyCard)
 *
 * Each form saves on its own; the sheet then toasts and closes.
 */

import { useRouter } from 'next/navigation';
import { Activity, MoonStar, NotebookPen, Pill, type LucideIcon } from 'lucide-react';
import {
  Button, CardGridRow, CardSection, CardSectionLabel, Dialog, useToast,
} from '@/components/ui';
import { QuickAddTaskForm } from '@/components/tasks/TaskForm';
import { BrainDumpForm }    from '@/components/brain-dump/BrainDumpForm';
import { useLocalToday }    from '@/lib/hooks/useLocalToday';
import type { DailyTabId }  from '@/lib/constants/nav';

interface LogShortcut {
  label: string;
  icon:  LucideIcon;
  tab:   DailyTabId;
}

/** Laid out two per row. */
const LOG_SHORTCUT_ROWS: LogShortcut[][] = [
  [
    { label: 'Symptom',   icon: Activity, tab: 'symptoms' },
    { label: 'Took meds', icon: Pill,     tab: 'meds' },
  ],
  [
    { label: 'Sleep',     icon: MoonStar,    tab: 'sleep' },
    { label: 'Journal',   icon: NotebookPen, tab: 'journal' },
  ],
];

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddSheet({ open, onOpenChange }: Readonly<Props>) {
  const router       = useRouter();
  const today        = useLocalToday();
  const { addToast } = useToast();

  const close = () => onOpenChange(false);

  const savedAndClose = (message: string) => {
    addToast(message, 'success');
    close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Quick add" placement="bottom">
      <CardSection>
        <CardSectionLabel>Quick task</CardSectionLabel>
        <QuickAddTaskForm
          minimal
          contextDate={today ?? undefined}
          onAdded={() => savedAndClose('Task added')}
        />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Brain dump</CardSectionLabel>
        <BrainDumpForm
          bare
          compact
          onSaved={() => {
            savedAndClose('Brain dump saved');
            router.refresh();
          }}
        />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Log something</CardSectionLabel>
        {LOG_SHORTCUT_ROWS.map((row, i) => (
          <CardGridRow key={i}>
            {row.map(s => {
              const Icon = s.icon;
              return (
                <Button
                  key={s.label}
                  href={`/daily/${today ?? ''}?tab=${s.tab}`}
                  variant="tile-row"
                  onClick={close}
                >
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                  {s.label}
                </Button>
              );
            })}
          </CardGridRow>
        ))}
      </CardSection>
    </Dialog>
  );
}
