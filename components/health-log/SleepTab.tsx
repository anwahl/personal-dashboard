'use client';

import { useState, useCallback } from 'react';
import { createClient }     from '@/lib/supabase/client';
import { upsertSleepEntry, upsertNap, deleteNap, upsertWakeEvents, setSleepEvents, setSleepTimingEntry, setSleepConsumptionEntries } from '@/lib/dal/sleep';
import { CardSection, CardSectionLabel } from '@/components/ui/Card';
import { SliderField }      from '@/components/ui/SliderField';
import { Chip, ChipGroup }  from '@/components/ui/Chip';
import { Toggle }           from '@/components/ui/Controls';
import { Button }           from '@/components/ui/Button';
import { InputField, SaveStatus } from '@/components/ui/Display';
import type { SaveState }   from '@/components/ui/Display';
import type { SleepEntryDetail, PriorSleepContext, ReferenceData } from '@/types/dal';
import type { SleepEntryRow } from '@/types/schema';

type Mode = 'view' | 'input';

interface Props {
  entryId:    number;
  date:       string;
  sleep:      SleepEntryDetail | null;
  priorSleep: PriorSleepContext | null;
  reference:  ReferenceData;
  mode:       Mode;
}

// ── View mode ─────────────────────────────────────────────────────────────────

function SleepView({ sleep, priorSleep, reference }: Omit<Props, 'entryId' | 'date' | 'mode'>) {
  if (!sleep) return <p className="empty-state">Sleep not logged yet.</p>;

  const sleepEventNames = reference.sleepEventTypes
    .filter(t => sleep.sleep_event_ids.includes(t.id))
    .map(t => t.type_name);

  return (
    <div>
      <div className="metric-display">
        <span className="metric-display__emoji">⭐</span>
        <span className="metric-display__label">Quality</span>
        <span className={`metric-display__value${sleep.sleep_quality == null ? ' metric-display__value--empty' : ''}`}>
          {sleep.sleep_quality ?? '–'}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/10</span>
        </span>
      </div>
      <div className="metric-display">
        <span className="metric-display__emoji">🕐</span>
        <span className="metric-display__label">Hours</span>
        <span className={`metric-display__value${sleep.hours_slept == null ? ' metric-display__value--empty' : ''}`}>
          {sleep.hours_slept ?? '–'}
        </span>
      </div>
      {sleep.bedtime && (
        <div className="metric-display">
          <span className="metric-display__emoji">🌙</span>
          <span className="metric-display__label">Bedtime → Wake</span>
          <span className="metric-display__value" style={{ fontSize: '0.9rem' }}>
            {sleep.bedtime} → {sleep.wake_time ?? '?'}
          </span>
        </div>
      )}
      {sleep.nap && (
        <div className="metric-display">
          <span className="metric-display__emoji">🛋️</span>
          <span className="metric-display__label">Nap</span>
          <span className="metric-display__value" style={{ fontSize: '0.9rem' }}>
            {sleep.nap.duration_min ? `${sleep.nap.duration_min}min` : 'Yes'}
            {sleep.nap.was_refreshing ? ' ✓' : ''}
          </span>
        </div>
      )}
      {sleepEventNames.length > 0 && (
        <CardSection>
          <CardSectionLabel>Events</CardSectionLabel>
          <ChipGroup>
            {sleepEventNames.map(name => <Chip key={name} active small style={{ cursor: 'default' }}>{name}</Chip>)}
          </ChipGroup>
        </CardSection>
      )}
      {sleep.sleep_notes && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
          {sleep.sleep_notes}
        </p>
      )}
    </div>
  );
}

// ── Input mode ────────────────────────────────────────────────────────────────

function SleepInput({ entryId, date, sleep, priorSleep, reference }: Omit<Props, 'mode'>) {
  const supabase = createClient();

  const [quality,     setQuality]    = useState<number | null>(sleep?.sleep_quality ?? null);
  const [hours,       setHours]      = useState<string>(sleep?.hours_slept?.toString() ?? '');
  const [bedtime,     setBedtime]    = useState(sleep?.bedtime ?? '');
  const [wakeTime,    setWakeTime]   = useState(sleep?.wake_time ?? '');
  const [latency,     setLatency]    = useState<string>(sleep?.sleep_latency_min?.toString() ?? '');
  const [inertia,     setInertia]    = useState<string>(sleep?.sleep_inertia_min?.toString() ?? '');
  const [osa,         setOsa]        = useState<string>(sleep?.osa_event_count?.toString() ?? '');
  const [notes,       setNotes]      = useState(sleep?.sleep_notes ?? '');
  const [preBedActivity, setPreBedActivity] = useState(sleep?.today_pre_bed_activity ?? '');

  // Wake events
  const [wakeCount,  setWakeCount]   = useState(sleep?.wake_events?.event_count ?? 0);
  const [wakeMins,   setWakeMins]    = useState<string>(sleep?.wake_events?.duration_min?.toString() ?? '');
  const [wakeDetail, setWakeDetail]  = useState(sleep?.wake_events?.detail ?? '');

  // Nap
  const [hadNap,     setHadNap]      = useState(!!sleep?.nap);
  const [napDuration,setNapDuration] = useState<string>(sleep?.nap?.duration_min?.toString() ?? '');
  const [napRefresh, setNapRefresh]  = useState(sleep?.nap?.was_refreshing ?? false);

  // Sleep events (hallucinations, restless legs, etc.)
  const [sleepEventIds, setSleepEventIds] = useState<number[]>(sleep?.sleep_event_ids ?? []);

  // Timing: map of timing_category_id → timing_option_id
  const initialTimingMap: Record<number, number> = {};
  sleep?.timing_entries.forEach(te => { initialTimingMap[te.timing_category_id] = te.timing_option_id; });
  const [timingMap, setTimingMap] = useState<Record<number, number>>(initialTimingMap);

  // Consumption (pre-bed, for tonight)
  const [consumptionIds, setConsumptionIds] = useState<number[]>(sleep?.consumption_ids ?? []);

  const [saveState, setSaveState] = useState<SaveState>('idle');

  const toggleSleepEvent = (id: number) => {
    setSleepEventIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const setTiming = (categoryId: number, optionId: number) => {
    setTimingMap(prev => ({ ...prev, [categoryId]: optionId }));
  };

  const toggleConsumption = (id: number) => {
    setConsumptionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      const fields: Partial<SleepEntryRow> = {
        sleep_quality:          quality,
        hours_slept:            hours     ? parseFloat(hours)   : null,
        bedtime:                bedtime   || null,
        wake_time:              wakeTime  || null,
        sleep_latency_min:      latency   ? parseInt(latency)   : null,
        sleep_inertia_min:      inertia   ? parseInt(inertia)   : null,
        osa_event_count:        osa       ? parseFloat(osa)     : null,
        sleep_notes:            notes     || null,
        today_pre_bed_activity: preBedActivity || null,
      };

      const sleepRow = await upsertSleepEntry(supabase, entryId, fields);

      await Promise.all([
        // Wake events
        wakeCount > 0
          ? upsertWakeEvents(supabase, sleepRow.id, {
              event_count: wakeCount,
              duration_min: wakeMins  ? parseInt(wakeMins)  : 0,
              detail:       wakeDetail || null,
            })
          : Promise.resolve(),

        // Nap
        hadNap
          ? upsertNap(supabase, sleepRow.id, {
              duration_min:   napDuration ? parseInt(napDuration) : null,
              was_refreshing: napRefresh,
            })
          : deleteNap(supabase, sleepRow.id),

        // Boolean sleep events
        setSleepEvents(supabase, sleepRow.id, sleepEventIds),

        // Consumption
        setSleepConsumptionEntries(supabase, sleepRow.id, consumptionIds),
      ]);

      // Timing entries (one per category)
      for (const [catIdStr, optId] of Object.entries(timingMap)) {
        await setSleepTimingEntry(supabase, sleepRow.id, parseInt(catIdStr), optId);
      }

      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [supabase, entryId, quality, hours, bedtime, wakeTime, latency, inertia, osa, notes, preBedActivity, wakeCount, wakeMins, wakeDetail, hadNap, napDuration, napRefresh, sleepEventIds, consumptionIds, timingMap]);

  return (
    <div>
      {/* Prior night context (read-only) */}
      {priorSleep && (
        <div className="prior-context">
          <p className="prior-context__title">Prior night</p>
          {priorSleep.today_pre_bed_activity && (
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
              Activity: {priorSleep.today_pre_bed_activity}
            </p>
          )}
          {reference.timingCategories.map(cat => {
            const entry = priorSleep.timing_entries.find(te => te.timing_category_id === cat.id);
            const option = reference.timingOptions.find(o => o.id === entry?.timing_option_id);
            return option ? (
              <p key={cat.id} style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                {cat.category_name}: {option.option_name}
              </p>
            ) : null;
          })}
          {priorSleep.consumption_ids.length > 0 && (
            <ChipGroup>
              {reference.consumptionTypes
                .filter(t => priorSleep.consumption_ids.includes(t.id))
                .map(t => <Chip key={t.id} active small style={{ cursor: 'default' }}>{t.type_name}</Chip>)
              }
            </ChipGroup>
          )}
        </div>
      )}

      {/* Quality */}
      <CardSection>
        <SliderField emoji="⭐" label="Sleep Quality" value={quality} min={1} max={10} onChange={setQuality} />
      </CardSection>

      {/* Times */}
      <CardSection>
        <CardSectionLabel>Times</CardSectionLabel>
        <div className="field-grid">
          <InputField label="Bedtime" id="bedtime">
            <input id="bedtime" type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} />
          </InputField>
          <InputField label="Wake time" id="wake-time">
            <input id="wake-time" type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
          </InputField>
        </div>
        <div className="field-grid field-grid--3">
          <InputField label="Hours" id="hours-slept">
            <input id="hours-slept" type="number" min={0} max={24} step={0.25} value={hours} placeholder="7.5" onChange={e => setHours(e.target.value)} />
          </InputField>
          <InputField label="Latency (min)" id="latency">
            <input id="latency" type="number" min={0} value={latency} placeholder="20" onChange={e => setLatency(e.target.value)} />
          </InputField>
          <InputField label="Inertia (min)" id="inertia">
            <input id="inertia" type="number" min={0} value={inertia} placeholder="15" onChange={e => setInertia(e.target.value)} />
          </InputField>
        </div>
        <InputField label="OSA events/hr" id="osa">
          <input id="osa" type="number" min={0} step={0.1} value={osa} placeholder="0.0" onChange={e => setOsa(e.target.value)} />
        </InputField>
      </CardSection>

      {/* Wake events */}
      <CardSection>
        <CardSectionLabel>Wake events ({wakeCount})</CardSectionLabel>
        <SliderField emoji="😤" label="Count" value={wakeCount} min={0} max={10} onChange={setWakeCount} />
        {wakeCount > 0 && (
          <div className="conditional-block">
            <div className="field-grid">
              <InputField label="Duration (min)" id="wake-mins">
                <input id="wake-mins" type="number" min={0} value={wakeMins} onChange={e => setWakeMins(e.target.value)} />
              </InputField>
            </div>
            <InputField label="Detail" id="wake-detail">
              <input id="wake-detail" type="text" value={wakeDetail} placeholder="What woke you up?" onChange={e => setWakeDetail(e.target.value)} />
            </InputField>
          </div>
        )}
      </CardSection>

      {/* Nap */}
      <CardSection>
        <Toggle label="Napped today" checked={hadNap} onChange={() => setHadNap(n => !n)} />
        {hadNap && (
          <div className="conditional-block">
            <div className="field-grid">
              <InputField label="Duration (min)" id="nap-duration">
                <input id="nap-duration" type="number" min={0} value={napDuration} onChange={e => setNapDuration(e.target.value)} />
              </InputField>
            </div>
            <Toggle label="Was refreshing" checked={napRefresh} onChange={() => setNapRefresh(r => !r)} />
          </div>
        )}
      </CardSection>

      {/* Sleep events — data from sleep_event_types table */}
      <CardSection>
        <CardSectionLabel>Sleep events</CardSectionLabel>
        {reference.sleepEventTypes.length === 0 ? (
          <p className="empty-state">No sleep event types configured.</p>
        ) : (
          <div className="toggle-grid">
            {reference.sleepEventTypes.map(t => (
              <Toggle
                key={t.id}
                label={t.type_name}
                checked={sleepEventIds.includes(t.id)}
                onChange={() => toggleSleepEvent(t.id)}
              />
            ))}
          </div>
        )}
      </CardSection>

      {/* Tonight's context */}
      <CardSection>
        <CardSectionLabel>Tonight's context</CardSectionLabel>
        {reference.timingCategories.map(cat => (
          <div key={cat.id} style={{ marginBottom: 10 }}>
            <p className="card__section-label">{cat.category_name}</p>
            <ChipGroup>
              {reference.timingOptions.map(opt => (
                <Chip
                  key={opt.id}
                  active={timingMap[cat.id] === opt.id}
                  small
                  onClick={() => setTiming(cat.id, opt.id)}
                >
                  {opt.option_name}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        ))}

        <p className="card__section-label" style={{ marginTop: 8 }}>Pre-bed consumption</p>
        <ChipGroup>
          {reference.consumptionTypes.map(t => (
            <Chip
              key={t.id}
              active={consumptionIds.includes(t.id)}
              small
              onClick={() => toggleConsumption(t.id)}
            >
              {t.type_name}
            </Chip>
          ))}
        </ChipGroup>

        <div style={{ marginTop: 10 }}>
          <InputField label="Pre-bed activity" id="pre-bed-activity">
            <input
              id="pre-bed-activity"
              type="text"
              value={preBedActivity}
              onChange={e => setPreBedActivity(e.target.value)}
              placeholder="What did you do before bed?"
            />
          </InputField>
        </div>
      </CardSection>

      {/* Notes */}
      <CardSection>
        <CardSectionLabel>Sleep notes</CardSectionLabel>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything notable…" style={{ minHeight: 60 }} />
      </CardSection>

      <Button variant="accent" full onClick={save} disabled={saveState === 'saving'}>
        {saveState === 'saving' ? 'Saving…' : '💾 Save Sleep'}
      </Button>
      <SaveStatus state={saveState} />
    </div>
  );
}

// ── Tab export ────────────────────────────────────────────────────────────────

export function SleepTab({ mode, ...props }: Props) {
  return mode === 'view'
    ? <SleepView   sleep={props.sleep} priorSleep={props.priorSleep} reference={props.reference} />
    : <SleepInput  {...props} />;
}
