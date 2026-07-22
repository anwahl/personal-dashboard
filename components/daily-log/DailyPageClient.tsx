'use client';

/**
 * DailyPageClient
 *
 * Single client-side owner of ALL daily entry form state.
 * Passes state + setters down to DailyCard (merged card with 6 tabs).
 */

import { useState, useCallback } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';

import { updateDailyEntry, toggleTagEntry, upsertBrainDump } from '@/lib/dal/daily';
import { toggleBooleanEntry, saveNumericEntries }            from '@/lib/dal/trackables';
import { upsertSleepEntry, upsertNap, deleteNap, upsertWakeEvents,
         setSleepEvents, setSleepTimingEntry, setSleepConsumptionEntries } from '@/lib/dal/sleep';
import { setDailySymptomEntries, upsertCrash, deleteCrash,
         upsertAnxiety, deleteAnxiety }                      from '@/lib/dal/symptoms';
import { saveJournalResponses }                              from '@/lib/dal/journal';
import type { JournalResponseDetail }                        from '@/lib/dal/journal';

import { Button }      from '@/components/ui/Button';
import { SaveStatus }  from '@/components/ui/Display';
import type { SaveState } from '@/components/ui/Display';
import { DailyCard }   from './DailyCard';
import type { JournalCategoryWithPrompts }                   from '@/types/dal';

import type {
  DailyEntryDetail, SleepEntryDetail, DailySymptomData,
  EssEntryDetail, PrescriptionDetail, PriorSleepContext, ReferenceData,
} from '@/types/dal';
import type { SleepEntryRow } from '@/types/schema';

// ── Form state types ──────────────────────────────────────────────────────────

type Mode = 'view' | 'input';

/** trackable_id → value (null = not logged / clear the row) */
export type MetricState = Record<number, number | null>;

export interface DailyOverviewState {
  summary:    string;
  word:       string;
  dailyEmoji: string;
  brainDump:  string;
}

export interface SymptomFormState {
  hadCrash:        boolean;
  crashTiming:     string;
  crashSeverity:   number | null;
  hadAnxiety:      boolean;
  anxietySeverity: number | null;
  anxietyDetail:   string;
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

function initOverviewState(entry: DailyEntryDetail): DailyOverviewState {
  return {
    summary:    entry.summary     ?? '',
    word:       entry.word        ?? '',
    dailyEmoji: entry.daily_emoji ?? '',
    brainDump:  entry.brain_dump?.body_md ?? '',
  };
}

function initMetricState(entry: DailyEntryDetail): MetricState {
  return Object.fromEntries(
    entry.numeric_entries.map(e => [e.trackable_id, e.metric_value])
  );
}

function initSymptomState(symptoms: DailySymptomData | null): SymptomFormState {
  return {
    hadCrash:        !!symptoms?.crash,
    crashTiming:     symptoms?.crash?.timing    ?? '',
    crashSeverity:   symptoms?.crash?.severity  ?? null,
    hadAnxiety:      !!symptoms?.anxiety,
    anxietySeverity: symptoms?.anxiety?.severity ?? null,
    anxietyDetail:   symptoms?.anxiety?.detail   ?? '',
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
  entry:         DailyEntryDetail;
  journalResponses: JournalResponseDetail[];
  date:          string;
  sleep:         SleepEntryDetail | null;
  priorSleep:    PriorSleepContext | null;
  symptoms:      DailySymptomData | null;
  ess:           EssEntryDetail | null;
  prescriptions: PrescriptionDetail[];
  reference:     ReferenceData;
}

function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DailyPageClient({
  entry, date, sleep, priorSleep, symptoms, ess, prescriptions, reference, journalResponses,
}: Props) {
  const supabase = createClient();
  const router   = useRouter();

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

  const [checkedTrackableIds, setCheckedTrackableIds] = useState<number[]>(entry.checked_trackable_ids);
  const [tagIds, setTagIds] = useState<number[]>(entry.tag_ids);

  // ── Immediate-save toggles ────────────────────────────────────────────────

  const toggleBoolean = useCallback(async (trackableId: number) => {
    const nowDone = !checkedTrackableIds.includes(trackableId);
    setCheckedTrackableIds(prev =>
      nowDone ? [...prev, trackableId] : prev.filter(id => id !== trackableId)
    );
    try {
      await toggleBooleanEntry(supabase, entry.id, trackableId, nowDone);
    } catch {
      setCheckedTrackableIds(prev =>
        nowDone ? prev.filter(id => id !== trackableId) : [...prev, trackableId]
      );
    }
  }, [checkedTrackableIds, supabase, entry.id]);

  const toggleTag = useCallback(async (tagId: number) => {
    const nowActive = !tagIds.includes(tagId);
    setTagIds(prev => nowActive ? [...prev, tagId] : prev.filter(id => id !== tagId));
    try {
      await toggleTagEntry(supabase, entry.id, tagId, nowActive);
    } catch {
      setTagIds(prev => nowActive ? prev.filter(id => id !== tagId) : [...prev, tagId]);
    }
  }, [tagIds, supabase, entry.id]);

  const addNewTag = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed) return;

    const { data: existing } = await supabase
      .from('tags').select('id').eq('tag_value', trimmed).maybeSingle();

    let tagId: number;
    if (existing) {
      tagId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from('tags').insert({ tag_value: trimmed }).select('id').single();
      if (error || !created) return;
      tagId = created.id;
    }

    if (!tagIds.includes(tagId)) {
      setTagIds(prev => [...prev, tagId]);
      await toggleTagEntry(supabase, entry.id, tagId, true);
    }
  }, [tagIds, supabase, entry.id]);

  // ── Journal-only save (tab Save button) ──────────────────────────────────

  const saveJournal = async () => {
    setJournalSaveState('saving');
    try {
      await saveJournalResponses(supabase, entry.id, journalState.map(c => ({
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
      // 1. Core daily entry fields + numeric metrics + brain dump (parallel)
      await Promise.all([
        updateDailyEntry(supabase, entry.id, {
          summary:     overviewState.summary    || null,
          word:        overviewState.word       || null,
          daily_emoji: overviewState.dailyEmoji || null,
        }),
        saveNumericEntries(supabase, entry.id, metricState),
        upsertBrainDump(supabase, entry.id, date, overviewState.brainDump),
      ]);

      // 2. Sleep entry + child tables (sequential: need sleepRow.id)
      const anySleepData =
        sleepState.quality != null || sleepState.hoursSlept || sleepState.bedtime;

      if (anySleepData) {
        const sleepFields: Partial<SleepEntryRow> = {
          sleep_quality:          sleepState.quality,
          hours_slept:            sleepState.hoursSlept   ? parseFloat(sleepState.hoursSlept)  : null,
          bedtime:                sleepState.bedtime       || null,
          wake_time:              sleepState.wakeTime      || null,
          sleep_latency_min:      sleepState.latencyMin   ? parseInt(sleepState.latencyMin)    : null,
          sleep_inertia_min:      sleepState.inertiaSeverity,
          osa_event_count:        sleepState.osaCount      ? parseFloat(sleepState.osaCount)   : null,
          sleep_notes:            sleepState.notes         || null,
          today_pre_bed_activity: sleepState.preBedActivity || null,
        };

        const sleepRow = await upsertSleepEntry(supabase, entry.id, sleepFields);

        await Promise.all([
          sleepState.wakeCount > 0
            ? upsertWakeEvents(supabase, sleepRow.id, {
                event_count:  sleepState.wakeCount,
                duration_min: sleepState.wakeMins ? parseInt(sleepState.wakeMins) : 0,
                detail:       sleepState.wakeDetail || null,
              })
            : Promise.resolve(),
          sleepState.hadNap
            ? upsertNap(supabase, sleepRow.id, {
                duration_min:   sleepState.napDuration ? parseInt(sleepState.napDuration) : null,
                was_refreshing: sleepState.napRefresh,
              })
            : deleteNap(supabase, sleepRow.id),
          setSleepEvents(supabase, sleepRow.id, sleepState.sleepEventIds),
          setSleepConsumptionEntries(supabase, sleepRow.id, sleepState.consumptionIds),
        ]);

        for (const [catId, optId] of Object.entries(sleepState.timingMap)) {
          await setSleepTimingEntry(supabase, sleepRow.id, parseInt(catId), optId);
        }

        setHasSleepData(true);
      }

      // 3. Symptom types + crash + anxiety
      const anySymptomData =
        symptomState.symptomTypeIds.length > 0 ||
        symptomState.hadCrash ||
        symptomState.hadAnxiety;

      if (anySymptomData || hasSymptomData) {
        await Promise.all([
          setDailySymptomEntries(
            supabase, entry.id,
            symptomState.symptomTypeIds.map(id => ({ symptom_type_id: id, severity: null }))
          ),
          symptomState.hadCrash
            ? upsertCrash(supabase, entry.id, {
                timing:   symptomState.crashTiming || null,
                severity: symptomState.crashSeverity,
              })
            : deleteCrash(supabase, entry.id),
          symptomState.hadAnxiety
            ? upsertAnxiety(supabase, entry.id, {
                severity: symptomState.anxietySeverity,
                detail:   symptomState.anxietyDetail || null,
              })
            : deleteAnxiety(supabase, entry.id),
        ]);
        setHasSymptomData(true);
      }

      // 4. Journal responses
      await saveJournalResponses(supabase, entry.id, journalState.map(c => ({
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
    supabase, router, entry.id, date,
    overviewState, metricState, sleepState, symptomState, hasSymptomData, journalState,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {entry.intention && (
        <p className="intention-header">"{entry.intention.value}"</p>
      )}

      <DailyCard
        mode={mode}
        entry={entry}
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
        reference={reference}
        journalState={journalState}
        setJournalState={setJournalState}
        journalCategories={reference.journalCategories}
        onSaveJournal={saveJournal}
        journalSaveState={journalSaveState}
      />

      <div className="page-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode(m => m === 'view' ? 'input' : 'view')}
        >
          {mode === 'view' ? '✏️ Edit' : '👁 View'}
        </Button>
        {mode === 'input' && (
          <Button
            variant="accent"
            onClick={save}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Saving…' : 'Save'}
          </Button>
        )}
        <SaveStatus state={saveState} />
      </div>
    </>
  );
}
