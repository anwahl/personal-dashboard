'use client';

/**
 * DailyPageClient
 *
 * Single client-side owner of the daily entry's state; DailyCard draws it.
 *
 * Yes/no tiles, prescriptions, tags and aggregate answers save as soon as
 * they're tapped. Other trackables (sliders, combos, times, choices, text,
 * icons) save with the Save button. Placed components (journal, brain dump,
 * forms…) save on their own; they get the page's date, mode and entry
 * through DailyDayProvider.
 *
 * A date with no entry loads empty: the entry is created the first time
 * anything on the day is saved (getEntryId), so just visiting a date
 * leaves nothing behind.
 */

import { SaveStatus, Button, FieldActions, ModeToggle } from '@/components/ui';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';
import { localTodayISO } from '@/lib/utils/dates';
import { createDailyEntry } from '@/lib/dal/daily';
import { useTrackableValues } from './useTrackableValues';
import { DailyCard }   from './DailyCard';
import { DailyDayProvider } from '@/components/sections/DayContext';
import type { Mode } from './TrackableInputs';
import type { DailyEntryDetail, ReferenceData, SectionDetail } from '@/types/dal';
import type { ModuleData } from '@/lib/dal/modules';
import type { IntentionRow } from '@/types/schema';

// ── Journal card state ───────────────────────────────────────────────────────

export interface JournalCard {
  clientId:     string;    // browser-side key
  categoryId:   number;
  promptId:     number;
  promptText:   string;
  responseText: string;
  dbId:         number | null;  // null = not yet saved to DB
}

export type JournalState = JournalCard[];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** null = nothing saved for this date yet. */
  entry:            DailyEntryDetail | null;
  /** The day's intention (the saved one, or one picked for a new entry). */
  intention:        IntentionRow | null;
  date:             string;
  /** The DAILY sections, drawn as the card's tabs. */
  sections:         SectionDetail[];
  /** Data for components placed in those sections. */
  moduleData:       ModuleData;
  reference:        ReferenceData;
}

export function DailyPageClient({
  entry, intention, date, sections, moduleData, reference,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();

  // ── The day's entry: created on first save ────────────────────────────────
  // A ref (not state) so every save sees the id as soon as it exists, and a
  // shared promise so taps in quick succession create just one entry.
  const entryIdRef  = useRef<number | null>(entry?.id ?? null);
  const creatingRef = useRef<Promise<number> | null>(null);
  const getEntryId  = useCallback(async (): Promise<number> => {
    if (entryIdRef.current != null) return entryIdRef.current;
    creatingRef.current ??= createDailyEntry(supabase, date, intention?.id ?? null)
      .then(id => { entryIdRef.current = id; return id; })
      .finally(() => { creatingRef.current = null; });
    return creatingRef.current;
  }, [supabase, date, intention]);

  const isToday = date === localTodayISO();
  const [mode, setMode] = useState<Mode>(isToday ? 'input' : 'view');

  const { actions, save: saveValues, saveState } = useTrackableValues({
    initial: entry?.values ?? null, getEntryId, mode,
    icons: reference.icons, tags: reference.tags, prescriptions: reference.prescriptions,
  });

  const save = useCallback(async () => {
    try {
      await saveValues();
      router.refresh();
    } catch { /* shown by SaveStatus */ }
  }, [saveValues, router]);

  const day = useMemo(() => ({ date, mode, getEntryId }), [date, mode, getEntryId]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {intention && (
        <p className="intention-header">"{intention.value}"</p>
      )}

      <DailyDayProvider day={day}>
        <DailyCard sections={sections} moduleData={moduleData} actions={actions} reference={reference} />
      </DailyDayProvider>

      <FieldActions docked alignment="right">
        {mode === 'input' && (
          <Button
            variant="primary"
            onClick={save}
            busy={saveState === 'saving'}
          >
            Save
          </Button>
        )}
        <ModeToggle editing={mode === 'input'} onChange={e => setMode(e ? 'input' : 'view')} />
        <SaveStatus state={saveState} />
      </FieldActions>
    </>
  );
}
