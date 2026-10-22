'use client';

/**
 * DailyPageClient
 *
 * Single client-side owner of ALL daily entry form state.
 * Passes state + setters down to DailyCard (merged card with 6 tabs).
 *
 * A date with no entry loads empty: the entry is created the first time
 * anything on the day is saved (getEntryId), so just visiting a date
 * leaves nothing behind.
 */

import { SaveStatus, SaveState, Button, FieldActions, ModeToggle } from '@/components/ui';
import { saveJournalResponses, JournalResponseDetail } from '@/lib/dal/journal';
import { useState, useCallback, useRef } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';
import { localTodayISO } from '@/lib/utils/dates';
import { createDailyEntry, updateDailyEntry, toggleTagEntry, upsertBrainDump, findOrCreateTag } from '@/lib/dal/daily';
import { saveNumericEntries, upsertBooleanEntry, deleteBooleanEntry }            from '@/lib/dal/trackables';
import { upsertSleepEntry, upsertNap, deleteNap, upsertWakeEvents,
         setSleepEvents, setSleepTimingEntry, setSleepConsumptionEntries } from '@/lib/dal/sleep';
import { setDailySymptomEntries, upsertCrash, deleteCrash } from '@/lib/dal/symptoms';
import { DailyCard }   from './DailyCard';
import type {
  DailyEntryDetail, SleepEntryDetail, DailySymptomData,
  EssEntryDetail, PrescriptionDetail, PriorSleepContext, ReferenceData,
} from '@/types/dal';
import type { SleepEntryRow, IntentionRow } from '@/types/schema';

// ── Form state types ──────────────────────────────────────────────────────────

type Mode = 'view' | 'input';

/** trackable_id → value (null = not logged / clear the row) */
export type MetricState = Record<number, number | null>;

export interface DailyOverviewState {
  summary:     string;
  word:        string;
  dailyIconId: number | null;
  brainDump:   string;
}

export interface SymptomFormState {
  hadCrash:        boolean;
  crashTiming:     string;
  crashSeverity:   number | null;
  symptomTypeIds:  number[];
}

export interface SleepFormState {
  quality:         number | null;
  hoursSlept:      string;
  bedtime:         string;
  wakeTime:        string;
  latencyMin:      string;
  inertiaSeverity: number | null;
  osaCount:        string;
  notes:           string;
  preBedActivity:  string;
  wakeCount:       number;
  wakeMins:        string;
  wakeDetail:      string;
  hadNap:          boolean;
  napDuration:     string;
  napRefresh:      boolean;
  sleepEventIds:   number[];
  timingMap:       Record<number, number>;
  consumptionIds:  number[];
}

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

// ── State initialisers ─────────────────────────────────────────────────────────

function initOverviewState(entry: DailyEntryDetail | null): DailyOverviewState {
  return {
    summary:     entry?.summary  ?? '',
    word:        entry?.word     ?? '',
    dailyIconId: entry?.icon_id  ?? null,
    brainDump:   entry?.brain_dump?.body_md ?? '',
  };
}

function initMetricState(entry: DailyEntryDetail | null): MetricState {
  return Object.fromEntries(
    (entry?.numeric_entries ?? []).map(e => [e.trackable_id, e.metric_value])
  );
}

function initSymptomState(symptoms: DailySymptomData | null): SymptomFormState {
  return {
    hadCrash:        !!symptoms?.crash,
    crashTiming:     symptoms?.crash?.timing    ?? '',
    crashSeverity:   symptoms?.crash?.severity  ?? null,
    symptomTypeIds:  symptoms?.symptom_entries.map(s => s.symptom_type_id) ?? [],
  };
}

function initSleepState(sleep: SleepEntryDetail | null): SleepFormState {
  const timingMap: Record<number, number> = {};
  sleep?.timing_entries.forEach(te => { timingMap[te.timing_category_id] = te.timing_option_id; });
  return {
    quality:         sleep?.sleep_quality          ?? null,
    hoursSlept:      sleep?.hours_slept?.toString() ?? '',
    bedtime:         sleep?.bedtime                 ?? '',
    wakeTime:        sleep?.wake_time               ?? '',
    latencyMin:      sleep?.sleep_latency_min?.toString() ?? '',
    inertiaSeverity: sleep?.sleep_inertia_min       ?? null,
    osaCount:        sleep?.osa_event_count?.toString() ?? '',
    notes:           sleep?.sleep_notes             ?? '',
    preBedActivity:  sleep?.today_pre_bed_activity  ?? '',
    wakeCount:       sleep?.wake_events?.event_count   ?? 0,
    wakeMins:        sleep?.wake_events?.duration_min?.toString() ?? '',
    wakeDetail:      sleep?.wake_events?.detail         ?? '',
    hadNap:          !!sleep?.nap,
    napDuration:     sleep?.nap?.duration_min?.toString() ?? '',
    napRefresh:      sleep?.nap?.was_refreshing ?? false,
    sleepEventIds:   sleep?.sleep_event_ids ?? [],
    timingMap,
    consumptionIds:  sleep?.consumption_ids ?? [],
  };
}

function initJournalState(responses: JournalResponseDetail[]): JournalState {
  return responses.map((r, i) => ({
    clientId:     `loaded-${i}`,
    categoryId:   r.category_id,
    promptId:     r.prompt_id,
    promptText:   r.prompt_text,
    responseText: r.response_text ?? '',
    dbId:         r.id,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** null = nothing saved for this date yet. */
  entry:         DailyEntryDetail | null;
  /** The day's intention (the saved one, or one picked for a new entry). */
  intention:     IntentionRow | null;
  journalResponses: JournalResponseDetail[];
  date:          string;
  sleep:         SleepEntryDetail | null;
  priorSleep:    PriorSleepContext | null;
  symptoms:      DailySymptomData | null;
  ess:           EssEntryDetail | null;
  prescriptions: PrescriptionDetail[];
  reference:     ReferenceData;
}

export function DailyPageClient({
  entry, intention, date, sleep, priorSleep, symptoms, ess, prescriptions, reference, journalResponses,
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

  const isToday  = date === localTodayISO();
  const [mode,      setMode]      = useState<Mode>(isToday ? 'input' : 'view');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const [hasSleepData,   setHasSleepData]   = useState(!!sleep);
  const [hasSymptomData, setHasSymptomData] = useState(!!symptoms);

  const [overviewState, setOverviewState] = useState<DailyOverviewState>(() => initOverviewState(entry));
  const [metricState,   setMetricState]   = useState<MetricState>(() => initMetricState(entry));
  const [symptomState,  setSymptomState]  = useState<SymptomFormState>(() => initSymptomState(symptoms));
  const [sleepState,    setSleepState]    = useState<SleepFormState>(() => initSleepState(sleep));

  const [journalState,   setJournalState]   = useState<JournalState>(() => initJournalState(journalResponses));
  const [journalSaveState, setJournalSaveState] = useState<SaveState>('idle');

  const [checkedTrackableIds, setCheckedTrackableIds] = useState<number[]>(entry?.checked_trackable_ids ?? []);
  const [tagIds, setTagIds] = useState<number[]>(entry?.tag_ids ?? []);
  const [tags,   setTags]   = useState(reference.tags);

  // ── Immediate-save toggles ────────────────────────────────────────────────

  const toggleBoolean = useCallback(async (trackableId: number) => {
    const nowDone = !checkedTrackableIds.includes(trackableId);
    setCheckedTrackableIds(prev =>
      nowDone ? [...prev, trackableId] : prev.filter(id => id !== trackableId)
    );
    try {
      const entryId = await getEntryId();
      nowDone ? await upsertBooleanEntry(supabase, entryId, trackableId)
              : await deleteBooleanEntry(supabase, entryId, trackableId);
    } catch {
      setCheckedTrackableIds(prev =>
        nowDone ? prev.filter(id => id !== trackableId) : [...prev, trackableId]
      );
    }
  }, [checkedTrackableIds, supabase, getEntryId]);

  const toggleTag = useCallback(async (tagId: number) => {
    const nowActive = !tagIds.includes(tagId);
    setTagIds(prev => nowActive ? [...prev, tagId] : prev.filter(id => id !== tagId));
    try {
      await toggleTagEntry(supabase, await getEntryId(), tagId, nowActive);
    } catch {
      setTagIds(prev => nowActive ? prev.filter(id => id !== tagId) : [...prev, tagId]);
    }
  }, [tagIds, supabase, getEntryId]);

  const addNewTag = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed) return;

    const tag = await findOrCreateTag(supabase, trimmed);
    // A brand-new tag isn't in the page's tag list yet; add it so it shows.
    setTags(prev => prev.some(t => t.id === tag.id) ? prev : [...prev, tag]);

    if (!tagIds.includes(tag.id)) {
      setTagIds(prev => [...prev, tag.id]);
      await toggleTagEntry(supabase, await getEntryId(), tag.id, true);
    }
  }, [tagIds, supabase, getEntryId]);

  // ── Journal-only save (tab Save button) ──────────────────────────────────

  const saveJournal = async () => {
    setJournalSaveState('saving');
    try {
      await saveJournalResponses(supabase, await getEntryId(), journalState.map(c => ({
        promptId:     c.promptId,
        responseText: c.responseText,
        dbId:         c.dbId,
      })));
      setJournalSaveState('ok');
      setTimeout(() => setJournalSaveState('idle'), 2500);
    } catch {
      setJournalSaveState('error');
    }
  };

  // ── Batch save ────────────────────────────────────────────────────────────

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      const entryId = await getEntryId();

      // 1. Core daily entry fields + numeric metrics + brain dump (parallel)
      await Promise.all([
        updateDailyEntry(supabase, entryId, {
          summary:  overviewState.summary     || null,
          word:     overviewState.word        || null,
          icon_id:  overviewState.dailyIconId ?? null,
        }),
        saveNumericEntries(supabase, entryId, metricState),
        upsertBrainDump(supabase, entryId, date, overviewState.brainDump),
      ]);

      // 2. Sleep entry + child tables (sequential: need sleepRow.id)
      const anySleepData =
        sleepState.quality != null || sleepState.hoursSlept || sleepState.bedtime;

      if (anySleepData) {
        const sleepFields: Partial<SleepEntryRow> = {
          sleep_quality:          sleepState.quality,
          hours_slept:            sleepState.hoursSlept       ? Number.parseFloat(sleepState.hoursSlept)  : null,
          bedtime:                sleepState.bedtime          || null,
          wake_time:              sleepState.wakeTime         || null,
          sleep_latency_min:      sleepState.latencyMin       ? Number.parseInt(sleepState.latencyMin)    : null,
          sleep_inertia_min:      sleepState.inertiaSeverity,
          osa_event_count:        sleepState.osaCount         ? Number.parseFloat(sleepState.osaCount)    : null,
          sleep_notes:            sleepState.notes            || null,
          today_pre_bed_activity: sleepState.preBedActivity   || null,
        };

        const sleepRow = await upsertSleepEntry(supabase, entryId, sleepFields);

        await Promise.all([
          sleepState.wakeCount > 0
            ? upsertWakeEvents(supabase, sleepRow.id, {
                event_count:  sleepState.wakeCount,
                duration_min: sleepState.wakeMins ? Number.parseInt(sleepState.wakeMins) : 0,
                detail:       sleepState.wakeDetail || null,
              })
            : Promise.resolve(),
          sleepState.hadNap
            ? upsertNap(supabase, sleepRow.id, {
                duration_min:   sleepState.napDuration ? Number.parseInt(sleepState.napDuration) : null,
                was_refreshing: sleepState.napRefresh,
              })
            : deleteNap(supabase, sleepRow.id),
          setSleepEvents(supabase, sleepRow.id, sleepState.sleepEventIds),
          setSleepConsumptionEntries(supabase, sleepRow.id, sleepState.consumptionIds),
        ]);

        for (const [catId, optId] of Object.entries(sleepState.timingMap)) {
          await setSleepTimingEntry(supabase, sleepRow.id, Number.parseInt(catId), optId);
        }

        setHasSleepData(true);
      }

      // 3. Symptom types + crash
      const anySymptomData =
        symptomState.symptomTypeIds.length > 0 ||
        symptomState.hadCrash;

      if (anySymptomData || hasSymptomData) {
        await Promise.all([
          setDailySymptomEntries(
            supabase, entryId,
            symptomState.symptomTypeIds.map(id => ({ symptom_type_id: id, severity: null }))
          ),
          symptomState.hadCrash
            ? upsertCrash(supabase, entryId, {
                timing:   symptomState.crashTiming || null,
                severity: symptomState.crashSeverity,
              })
            : deleteCrash(supabase, entryId),
        ]);
        setHasSymptomData(true);
      }

      // 4. Journal responses
      await saveJournalResponses(supabase, entryId, journalState.map(c => ({
        promptId:     c.promptId,
        responseText: c.responseText,
        dbId:         c.dbId,
      })));

      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
      router.refresh();
    } catch (err) {
      console.error('Save failed:', err);
      setSaveState('error');
    }
  }, [
    supabase, router, getEntryId, date,
    overviewState, metricState, sleepState, symptomState, hasSymptomData, journalState,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {intention && (
        <p className="intention-header">"{intention.value}"</p>
      )}

      <DailyCard
        mode={mode}
        getEntryId={getEntryId}
        prescriptionIds={entry?.prescription_ids ?? []}
        date={date}
        overviewState={overviewState}
        setOverviewState={setOverviewState}
        metricState={metricState}
        setMetricState={setMetricState}
        checkedTrackableIds={checkedTrackableIds}
        toggleBoolean={toggleBoolean}
        tagIds={tagIds}
        toggleTag={toggleTag}
        addNewTag={addNewTag}
        sleepState={sleepState}
        setSleepState={setSleepState}
        hasSleepData={hasSleepData}
        symptomState={symptomState}
        setSymptomState={setSymptomState}
        hasSymptomData={hasSymptomData}
        priorSleep={priorSleep}
        ess={ess}
        prescriptions={prescriptions}
        reference={tags === reference.tags ? reference : { ...reference, tags }}
        journalState={journalState}
        setJournalState={setJournalState}
        journalCategories={reference.journalCategories}
        onSaveJournal={saveJournal}
        journalSaveState={journalSaveState}
      />

      <FieldActions docked alignment="right">
        {mode === 'input' && (
          <Button
            variant="accent"
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
