'use client';

/**
 * QuickLog — "Log something": shortcuts into a day's daily-page tabs
 * (?tab=…, read by DailyCard), one per DAILY section, two per row.
 * Fixed in the Quick add sheet; also placeable (QUICK_LOG).
 */

import { Button, CardGridRow, EmptyState } from '@/components/ui';
import { sectionTabId } from '@/lib/constants/nav';
import type { SectionDetail } from '@/types/dal';

export function QuickLog({ date, sections, onNavigate }: Readonly<{
  /** The day the shortcuts open. */
  date:        string;
  /** The DAILY sections. */
  sections:    SectionDetail[];
  /** Called when a shortcut is followed (e.g. so the Quick add sheet closes). */
  onNavigate?: () => void;
}>) {
  if (!sections.length) return <EmptyState>No daily tabs yet. Add them in Settings → Layout.</EmptyState>;

  const rows: SectionDetail[][] = [];
  for (let i = 0; i < sections.length; i += 2) rows.push(sections.slice(i, i + 2));

  return (
    <>
      {rows.map(row => (
        <CardGridRow key={row[0].id}>
          {row.map(s => (
            <Button key={s.id} href={`/daily/${date}?tab=${sectionTabId(s.id)}`} variant="tile-row" onClick={onNavigate}>
              {s.name}
            </Button>
          ))}
        </CardGridRow>
      ))}
    </>
  );
}
