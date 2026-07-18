'use client';

/**
 * DailyPageClient
 *
 * Single client-side owner of ALL form state for a daily entry.
 * Lifts state above DailyLogCard and HealthLogCard so that:
 *   - Tab switching never resets inputs
 *   - One Save button persists everything at once
 *   - View mode always reflects the latest saved values
 */

import { useState, useCallback } from 'react';
import { createClient }           from '@/lib/supabase/client';

// DAL
import { updateDailyEntry, toggleHabitEntry, toggleTagEntry, upsertBrainDump } from '@/lib/dal/daily';
import { upsertSleepEntry, upsertNap, deleteNap, upsertWakeEvents, setSleepEvents, setSleepTimingEntry, setSleepConsumptionEntries } from '@/lib/dal/sleep';
import { upsertSymptomEntry, setDailySymptomEntries, upsertCrash, deleteCrash, upsertAnxiety, deleteAnxiety } from '@/lib/dal/symptoms';

// UI primitives
import { Button }                  from '@/components/ui/Button';
import { SaveStatus }              from '@/components/ui/Display';
import type { SaveState }          from '@/components/ui/Display';

// Sub-cards
import { DailyLogCard }            from './DailyLogCard';
import { HealthLogCard }           from '../health-log/HealthLogCard';

// Types
import type {
  DailyEntryDetail, SleepEntryDetail, SymptomEntryDetail,
  EssEntryDetail, PrescriptionDetail, PriorSleepContext, ReferenceData,
} from '@/types/dal';
import type { HabitRow, TagRow, SleepEntryRow } from '@/types/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'view' | 'input';

export interface DailyLogState {
  mood:       number | null;
  energy:     number | null;
  summary:    string;
  word:       string;
  dailyEmoji: string;
  brainDump:  string;
}

export interface SleepFormState {
  quality:         number | null;
  hoursSlept:      string;
  bedtime:         string;
  wakeTime:        string;
  latencyMin:      string;
  inertiaSeverity: number | null;   // 0-10 slider
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
  timingMap:       Record<number, number>;  // category_id → option_id
  consumptionIds:  number[];
}

export interface SymptomFormState {
  painLevel:       number | null;
  brainFogLevel:   number | null;
  fatigueLevel:    number | null;
  backgroundNotes: string;
  whatHelped:      string;
  flagProvider:    boolean;
  hadCrash:        boolean;
  crashTiming:     string;
  crashSeverity:   number | null;
  hadAnxiety:      boolean;
  anxietySeverity: number | null;
  anxietyDetail:   string;
  symptomTypeIds:  number[];
}

interface Props {
  entry:         DailyEntryDetail;
  date:          string;
  sleep:         SleepEntryDetail | null;
  priorSleep:    PriorSleepContext | null;
  symptoms:      SymptomEntryDetail | null;
  ess:           EssEntryDetail | null;
  prescriptions: PrescriptionDetail[];
  reference:     ReferenceData;
}

/** Uses local browser date to avoid UTC/server timezone mismatch. */
function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── State initialisers ────────────────────────────────────────────────────────

function initDailyState(entry: DailyEntryDetail): DailyLogState {
  return {
    mood:       entry.mood,
    energy:     entry.energy,
    summary:    entry.summary   ?? '',
    word:       entry.word      ?? '',
    dailyEmoji: entry.daily_emoji ?? '',
    brainDump:  entry.brain_dump?.body_md ?? '',
  };
}

function initSleepState(sleep: SleepEntryDetail | null): SleepFormState {
  const timingMap: Record<number, number> = {};
  sleep?.timing_entries.forEach(te => { timingMap[te.timing_category_id] = te.timing_option_id; });

  return {
    quality:         sleep?.sleep_quality ?? null,
    hoursSlept:      sleep?.hours_slept?.toString() ?? '',
    bedtime:         sleep?.bedtime      ?? '',
    wakeTime:        sleep?.wake_time    ?? '',
    latencyMin:      sleep?.sleep_latency_min?.toString() ?? '',
    inertiaSeverity: sleep?.sleep_inertia_min ?? null,
    osaCount:        sleep?.osa_event_count?.toString() ?? '',
    notes:           sleep?.sleep_notes  ?? '',
    preBedActivity:  sleep?.today_pre_bed_activity ?? '',
    wakeCount:       sleep?.wake_events?.event_count  ?? 0,
    wakeMins:        sleep?.wake_events?.duration_min?.toString() ?? '',
    wakeDetail:      sleep?.wake_events?.detail       ?? '',
    hadNap:          !!sleep?.nap,
    napDuration:     sleep?.nap?.duration_min?.toString() ?? '',
    napRefresh:      sleep?.nap?.was_refreshing ?? false,
    sleepEventIds:   sleep?.sleep_event_ids ?? [],
    timingMap,
    consumptionIds:  sleep?.consumption_ids ?? [],
  };
}

function initSymptomState(symptoms: SymptomEntryDetail | null): SymptomFormState {
  return {
    painLevel:       symptoms?.pain_level      ?? null,
    brainFogLevel:   symptoms?.brain_fog_level ?? null,
    fatigueLevel:    symptoms?.fatigue_level   ?? null,
    backgroundNotes: symptoms?.background_notes ?? '',
    whatHelped:      symptoms?.what_helped      ?? '',
    flagProvider:    symptoms?.flag_for_provider ?? false,
    hadCrash:        !!symptoms?.crash,
    crashTiming:     symptoms?.crash?.timing    ?? '',
    crashSeverity:   symptoms?.crash?.severity  ?? null,
    hadAnxiety:      !!symptoms?.anxiety,
    anxietySeverity: symptoms?.anxiety?.severity ?? null,
    anxietyDetail:   symptoms?.anxiety?.detail   ?? '',
    symptomTypeIds:  symptoms?.symptom_entries.map(s => s.symptom_type_id) ?? [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyPageClient({
  entry, date, sleep, priorSleep, symptoms, ess,
  prescriptions, reference,
}: Props) {
  const supabase = createClient();

  const isToday = date === localTodayISO();
  const [mode,        setMode]       = useState<Mode>(isToday ? 'input' : 'view');
  const [saveState,   setSaveState]  = useState<SaveState>('idle');

  // Whether child tables have ever had data persisted
  const [hasSleepData,   setHasSleepData]   = useState(!!sleep);
  const [hasSymptomData, setHasSymptomData] = useState(!!symptoms);

  // Form state — all lifted here so tabs never lose their values
  const [dailyState,   setDailyState]   = useState<DailyLogState>(() => initDailyState(entry));
  const [sleepState,   setSleepState]   = useState<SleepFormState>(() => initSleepState(sleep));
  const [symptomState, setSymptomState] = useState<SymptomFormState>(() => initSymptomState(symptoms));

  // Mutable habit/tag ids (immediate-save on toggle)
  const [habitIds, setHabitIds] = useState<number[]>(entry.habit_ids);
  const [tagIds,   setTagIds]   = useState<number[]>(entry.tag_ids);

  // ── Immediate-save toggles ────────────────────────────────────────────────

  const toggleHabit = useCallback(async (habitId: number) => {
    const nowDone = !habitIds.includes(habitId);
    setHabitIds(prev => nowDone ? [...prev, habitId] : prev.filter(id => id !== habitId));
    try {
      await toggleHabitEntry(supabase, entry.id, habitId, nowDone);
    } catch {
      setHabitIds(prev => nowDone ? prev.filter(id => id !== habitId) : [...prev, habitId]);
    }
  }, [habitIds, supabase, entry.id]);

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

    // Create or find the tag
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('tag_value', trimmed)
      .maybeSingle();

    let tagId: number;
    if (existing) {
      tagId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from('tags')
        .insert({ tag_value: trimmed })
        .select('id')
        .single();
      if (error || !created) return;
      tagId = created.id;
    }

    // Add to entry if not already there
    if (!tagIds.includes(tagId)) {
      setTagIds(prev => [...prev, tagId]);
      await toggleTagEntry(supabase, entry.id, tagId, true);
    }
  }, [tagIds, supabase, entry.id]);

  // ── Batch save ────────────────────────────────────────────────────────────

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      // 1. Daily entry core fields + brain dump (parallel)
      await Promise.all([
        updateDailyEntry(supabase, entry.id, {
          mood:        dailyState.mood,
          energy:      dailyState.energy,
          summary:     dailyState.summary    || null,
          word:        dailyState.word       || null,
          daily_emoji: dailyState.dailyEmoji || null,
        }),
        upsertBrainDump(supabase, entry.id, date, dailyState.brainDump),
      ]);

      // 2. Sleep entry + all related tables (sequential due to FK dependency)
      const anySleepData =
        sleepState.quality != null || sleepState.hoursSlept || sleepState.bedtime;

      if (anySleepData) {
        const sleepFields: Partial<SleepEntryRow> = {
          sleep_quality:          sleepState.quality,
          hours_slept:            sleepState.hoursSlept   ? parseFloat(sleepState.hoursSlept)   : null,
          bedtime:                sleepState.bedtime       || null,
          wake_time:              sleepState.wakeTime      || null,
          sleep_latency_min:      sleepState.latencyMin   ? parseInt(sleepState.latencyMin)     : null,
          sleep_inertia_min:      sleepState.inertiaSeverity,
          osa_event_count:        sleepState.osaCount      ? parseFloat(sleepState.osaCount)    : null,
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

        // Timing entries (one per category)
        for (const [catId, optId] of Object.entries(sleepState.timingMap)) {
          await setSleepTimingEntry(supabase, sleepRow.id, parseInt(catId), optId);
        }

        setHasSleepData(true);
      }

      // 3. Symptom entry + related tables
      const anySymptomData =
        symptomState.painLevel != null ||
        symptomState.brainFogLevel != null ||
        symptomState.fatigueLevel != null ||
        symptomState.symptomTypeIds.length > 0 ||
        symptomState.hadCrash || symptomState.hadAnxiety;

      if (anySymptomData) {
        const symptomRow = await upsertSymptomEntry(supabase, entry.id, {
          pain_level:        symptomState.painLevel,
          brain_fog_level:   symptomState.brainFogLevel,
          fatigue_level:     symptomState.fatigueLevel,
          background_notes:  symptomState.backgroundNotes || null,
          what_helped:       symptomState.whatHelped      || null,
          flag_for_provider: symptomState.flagProvider,
        });

        await Promise.all([
          setDailySymptomEntries(
            supabase,
            symptomRow.id,
            symptomState.symptomTypeIds.map(id => ({ symptom_type_id: id, severity: null }))
          ),
          symptomState.hadCrash
            ? upsertCrash(supabase, entry.id, { timing: symptomState.crashTiming || null, severity: symptomState.crashSeverity })
            : deleteCrash(supabase, entry.id),
          symptomState.hadAnxiety
            ? upsertAnxiety(supabase, entry.id, { severity: symptomState.anxietySeverity, detail: symptomState.anxietyDetail || null })
            : deleteAnxiety(supabase, entry.id),
        ]);

        setHasSymptomData(true);
      }

      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveState('error');
    }
  }, [
    supabase, entry.id, date,
    dailyState, sleepState, symptomState,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {entry.intention && (
        <p className="intention-header">"{entry.intention.value}"</p>
      )}

      <div className="daily-grid">
        <DailyLogCard
          mode={mode}
          state={dailyState}
          setState={setDailyState}
          habits={reference.habits}
          habitIds={habitIds}
          toggleHabit={toggleHabit}
          tags={reference.tags}
          tagIds={tagIds}
          toggleTag={toggleTag}
          addNewTag={addNewTag}
        />

        <HealthLogCard
          mode={mode}
          entryId={entry.id}
          date={date}
          sleepState={sleepState}
          setSleepState={setSleepState}
          hasSleepData={hasSleepData}
          symptomState={symptomState}
          setSymptomState={setSymptomState}
          hasSymptomData={hasSymptomData}
          priorSleep={priorSleep}
          ess={ess}
          prescriptions={prescriptions}
          prescriptionIds={entry.prescription_ids}
          reference={reference}
        />
      </div>

      <div className="page-actions">
        <SaveStatus state={saveState} />
        <Button
          variant="ghost"
          onClick={() => setMode(m => m === 'view' ? 'input' : 'view')}
        >
          {mode === 'view' ? '✏️ Edit' : '← View'}
        </Button>
        {mode === 'input' && (
          <Button
            variant="accent"
            onClick={save}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'Saving…' : '💾 Save'}
          </Button>
        )}
      </div>
    </>
  );
}
