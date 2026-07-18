import { useState, useCallback } from 'react';
import { createClient }           from '@/lib/supabase/client';
import { togglePrescriptionEntry } from '@/lib/dal/daily';
import { setEssResponse }          from '@/lib/dal/ess';

import { Card, CardHeader, CardTitle, CardBody, CardSection, CardSectionLabel } from '@/components/ui/Card';
import { TabBar }           from '@/components/ui/Controls';
import { Toggle }           from '@/components/ui/Controls';
import { SliderField }      from '@/components/ui/SliderField';
import { Chip, ChipGroup }  from '@/components/ui/Chip';
import { InputField }       from '@/components/ui/Display';

import type {
  SleepFormState,
  SymptomFormState,
}                           from '../daily-log/DailyPageClient';
import type {
  EssEntryDetail, PrescriptionDetail, PriorSleepContext, ReferenceData,
}                           from '@/types/dal';
import type {
  EssQuestionTypeRow, EssAnswerTypeRow,
}                           from '@/types/schema';

type Mode = 'view' | 'input';
type Tab  = 'sleep' | 'symptoms' | 'meds' | 'ess';

/** Scale max for all 0–N severity/quality sliders. Change here to update everywhere. */
const SEVERITY_MAX = 10;

/** Converts a Postgres TIME string (HH:MM:SS or HH:MM) to 12-hour format. */
function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Show a numeric rating as "value/MAX", or "–" if null. */
function Rating({ value, max = SEVERITY_MAX }: { value: number | null | undefined; max?: number }) {
  if (value == null) return <span className="metric-display__value metric-display__value--empty">–</span>;
  return (
    <span className="metric-display__value">
      {value}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/{max}</span>
    </span>
  );
}

const TABS = [
  { id: 'sleep',    label: '💤 Sleep'    },
  { id: 'symptoms', label: '🩺 Symptoms' },
  { id: 'meds',     label: '💊 Meds'     },
  { id: 'ess',      label: '😴 ESS'      },
] as const;

interface Props {
  mode:             Mode;
  entryId:          number;
  date:             string;
  sleepState:       SleepFormState;
  setSleepState:    React.Dispatch<React.SetStateAction<SleepFormState>>;
  hasSleepData:     boolean;
  symptomState:     SymptomFormState;
  setSymptomState:  React.Dispatch<React.SetStateAction<SymptomFormState>>;
  hasSymptomData:   boolean;
  priorSleep:       PriorSleepContext | null;
  ess:              EssEntryDetail | null;
  prescriptions:    PrescriptionDetail[];
  prescriptionIds:  number[];
  reference:        ReferenceData;
}

// ── Sleep tab ─────────────────────────────────────────────────────────────────

function SleepContent({ mode, sleepState, setSleepState, priorSleep, hasSleepData, reference }: {
  mode: Mode;
  sleepState: SleepFormState;
  setSleepState: React.Dispatch<React.SetStateAction<SleepFormState>>;
  priorSleep: PriorSleepContext | null;
  hasSleepData: boolean;
  reference: ReferenceData;
}) {
  const set = <K extends keyof SleepFormState>(key: K, val: SleepFormState[K]) =>
    setSleepState(prev => ({ ...prev, [key]: val }));

  if (mode === 'view') {
    if (!hasSleepData && sleepState.quality == null && !sleepState.hoursSlept) {
      return <p className="empty-state">Sleep not logged yet.</p>;
    }
    const activeEvents = reference.sleepEventTypes.filter(t => sleepState.sleepEventIds.includes(t.id));

    return (
      <div>
        {/* Core metrics */}
        <div className="metric-display">
          <span className="metric-display__emoji">⭐</span>
          <span className="metric-display__label">Quality</span>
          <Rating value={sleepState.quality} />
        </div>
        <div className="metric-display">
          <span className="metric-display__emoji">🕐</span>
          <span className="metric-display__label">Hours</span>
          <span className={`metric-display__value${!sleepState.hoursSlept ? ' metric-display__value--empty' : ''}`}>
            {sleepState.hoursSlept || '–'}
          </span>
        </div>
        {(sleepState.bedtime || sleepState.wakeTime) && (
          <div className="metric-display">
            <span className="metric-display__emoji">🌙</span>
            <span className="metric-display__label">Bedtime → Wake</span>
            <span className="metric-display__value" style={{ fontSize: '0.9rem' }}>
              {formatTime(sleepState.bedtime)} → {formatTime(sleepState.wakeTime) || '?'}
            </span>
          </div>
        )}
        {sleepState.latencyMin && (
          <div className="metric-display">
            <span className="metric-display__emoji">⏳</span>
            <span className="metric-display__label">Latency</span>
            <span className="metric-display__value" style={{ fontSize: '0.9rem' }}>{sleepState.latencyMin} min</span>
          </div>
        )}
        {sleepState.inertiaSeverity != null && (
          <div className="metric-display">
            <span className="metric-display__emoji">😵</span>
            <span className="metric-display__label">Inertia</span>
            <Rating value={sleepState.inertiaSeverity} />
          </div>
        )}
        {sleepState.osaCount && (
          <div className="metric-display">
            <span className="metric-display__emoji">📊</span>
            <span className="metric-display__label">OSA events/hr</span>
            <span className="metric-display__value" style={{ fontSize: '0.9rem' }}>{sleepState.osaCount}</span>
          </div>
        )}

        {/* Nap */}
        {sleepState.hadNap && (
          <div className="metric-display">
            <span className="metric-display__emoji">🛋️</span>
            <span className="metric-display__label">Nap</span>
            <span className="metric-display__value" style={{ fontSize: '0.9rem' }}>
              {sleepState.napDuration ? `${sleepState.napDuration} min` : 'Yes'}
              {sleepState.napRefresh ? ' · refreshing' : ''}
            </span>
          </div>
        )}

        {/* Wake events */}
        {sleepState.wakeCount > 0 && (
          <div className="metric-display">
            <span className="metric-display__emoji">😤</span>
            <span className="metric-display__label">Wake events</span>
            <span className="metric-display__value" style={{ fontSize: '0.9rem' }}>
              {sleepState.wakeCount}{sleepState.wakeMins ? ` · ${sleepState.wakeMins} min` : ''}
            </span>
          </div>
        )}
        {sleepState.wakeDetail && (
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '4px 0 8px', fontStyle: 'italic' }}>
            {sleepState.wakeDetail}
          </p>
        )}

        {/* Sleep events */}
        {activeEvents.length > 0 && (
          <CardSection>
            <CardSectionLabel>Events</CardSectionLabel>
            <ChipGroup>
              {activeEvents.map(e => (
                <Chip key={e.id} active small style={{ cursor: 'default' }}>{e.type_name}</Chip>
              ))}
            </ChipGroup>
          </CardSection>
        )}

        {/* Prior night context */}
        {priorSleep && (
          <CardSection>
            <CardSectionLabel>Prior night</CardSectionLabel>
            <div className="prior-context">
              {priorSleep.today_pre_bed_activity && (
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                  Activity: {priorSleep.today_pre_bed_activity}
                </p>
              )}
              {reference.timingCategories.map(cat => {
                const te = priorSleep.timing_entries.find(e => e.timing_category_id === cat.id);
                const opt = reference.timingOptions.find(o => o.id === te?.timing_option_id);
                return opt ? (
                  <p key={cat.id} style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                    {cat.category_name}: {opt.option_name}
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
          </CardSection>
        )}

        {/* Tonight's context */}
        {(sleepState.preBedActivity || Object.keys(sleepState.timingMap).length > 0 || sleepState.consumptionIds.length > 0) && (
          <CardSection>
            <CardSectionLabel>Tonight</CardSectionLabel>
            <div className="prior-context">
              {sleepState.preBedActivity && (
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                  Activity: {sleepState.preBedActivity}
                </p>
              )}
              {reference.timingCategories.map(cat => {
                const optId = sleepState.timingMap[cat.id];
                const opt = reference.timingOptions.find(o => o.id === optId);
                return opt ? (
                  <p key={cat.id} style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                    {cat.category_name}: {opt.option_name}
                  </p>
                ) : null;
              })}
              {sleepState.consumptionIds.length > 0 && (
                <ChipGroup>
                  {reference.consumptionTypes
                    .filter(t => sleepState.consumptionIds.includes(t.id))
                    .map(t => <Chip key={t.id} active small style={{ cursor: 'default' }}>{t.type_name}</Chip>)
                  }
                </ChipGroup>
              )}
            </div>
          </CardSection>
        )}

        {/* Notes */}
        {sleepState.notes && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>
            {sleepState.notes}
          </p>
        )}
      </div>
    );
  }

  // ── Input mode ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Prior night context — read-only, fetched from yesterday's sleep entry */}
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

      <CardSection>
        <SliderField emoji="⭐" label="Sleep Quality" value={sleepState.quality} min={1} max={SEVERITY_MAX} onChange={v => set('quality', v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Times</CardSectionLabel>
        <div className="field-grid">
          <InputField label="Bedtime" id="bedtime">
            <input id="bedtime" type="time" value={sleepState.bedtime} onChange={e => set('bedtime', e.target.value)} />
          </InputField>
          <InputField label="Wake time" id="wake-time">
            <input id="wake-time" type="time" value={sleepState.wakeTime} onChange={e => set('wakeTime', e.target.value)} />
          </InputField>
        </div>
        <div className="field-grid field-grid--3">
          <InputField label="Hours" id="hours-slept">
            <input id="hours-slept" type="number" min={0} max={24} step={0.25} value={sleepState.hoursSlept} placeholder="7.5" onChange={e => set('hoursSlept', e.target.value)} />
          </InputField>
          <InputField label="Latency (min)" id="latency">
            <input id="latency" type="number" min={0} value={sleepState.latencyMin} placeholder="20" onChange={e => set('latencyMin', e.target.value)} />
          </InputField>
          <InputField label="OSA events/hr" id="osa">
            <input id="osa" type="number" min={0} step={0.1} value={sleepState.osaCount} placeholder="0.0" onChange={e => set('osaCount', e.target.value)} />
          </InputField>
        </div>
        {/* Inertia as slider 0-10 */}
        <SliderField emoji="😵" label="Morning inertia" value={sleepState.inertiaSeverity} min={0} max={10} onChange={v => set('inertiaSeverity', v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Wake events ({sleepState.wakeCount})</CardSectionLabel>
        <SliderField emoji="😤" label="Count" value={sleepState.wakeCount} min={0} max={10} onChange={v => set('wakeCount', v)} />
        {sleepState.wakeCount > 0 && (
          <div className="conditional-block">
            <div className="field-grid">
              <InputField label="Duration (min)" id="wake-mins">
                <input id="wake-mins" type="number" min={0} value={sleepState.wakeMins} onChange={e => set('wakeMins', e.target.value)} />
              </InputField>
            </div>
            <InputField label="Detail" id="wake-detail">
              <input id="wake-detail" type="text" value={sleepState.wakeDetail} placeholder="What woke you?" onChange={e => set('wakeDetail', e.target.value)} />
            </InputField>
          </div>
        )}
      </CardSection>

      <CardSection>
        <Toggle label="Napped" checked={sleepState.hadNap} onChange={() => set('hadNap', !sleepState.hadNap)} />
        {sleepState.hadNap && (
          <div className="conditional-block">
            <div className="field-grid">
              <InputField label="Duration (min)" id="nap-duration">
                <input id="nap-duration" type="number" min={0} value={sleepState.napDuration} onChange={e => set('napDuration', e.target.value)} />
              </InputField>
            </div>
            <Toggle label="Refreshing" checked={sleepState.napRefresh} onChange={() => set('napRefresh', !sleepState.napRefresh)} />
          </div>
        )}
      </CardSection>

      {/* Sleep event types — data from DB */}
      <CardSection>
        <CardSectionLabel>Sleep events</CardSectionLabel>
        <div className="toggle-grid">
          {reference.sleepEventTypes.map(t => (
            <Toggle
              key={t.id}
              label={t.type_name}
              checked={sleepState.sleepEventIds.includes(t.id)}
              onChange={() => set(
                'sleepEventIds',
                sleepState.sleepEventIds.includes(t.id)
                  ? sleepState.sleepEventIds.filter(id => id !== t.id)
                  : [...sleepState.sleepEventIds, t.id]
              )}
            />
          ))}
        </div>
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
                  active={sleepState.timingMap[cat.id] === opt.id}
                  small
                  onClick={() => set('timingMap', { ...sleepState.timingMap, [cat.id]: opt.id })}
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
              active={sleepState.consumptionIds.includes(t.id)}
              small
              onClick={() => set(
                'consumptionIds',
                sleepState.consumptionIds.includes(t.id)
                  ? sleepState.consumptionIds.filter(id => id !== t.id)
                  : [...sleepState.consumptionIds, t.id]
              )}
            >
              {t.type_name}
            </Chip>
          ))}
        </ChipGroup>

        <div style={{ marginTop: 10 }}>
          <InputField label="Pre-bed activity" id="pre-bed-activity">
            <input id="pre-bed-activity" type="text" value={sleepState.preBedActivity} onChange={e => set('preBedActivity', e.target.value)} placeholder="What did you do before bed?" />
          </InputField>
        </div>
      </CardSection>

      <CardSection>
        <CardSectionLabel>Notes</CardSectionLabel>
        <textarea value={sleepState.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything notable…" style={{ minHeight: 60 }} />
      </CardSection>
    </div>
  );
}

// ── Symptoms tab ──────────────────────────────────────────────────────────────

function SymptomsContent({ mode, symptomState, setSymptomState, hasSymptomData, reference }: {
  mode: Mode;
  symptomState: SymptomFormState;
  setSymptomState: React.Dispatch<React.SetStateAction<SymptomFormState>>;
  hasSymptomData: boolean;
  reference: ReferenceData;
}) {
  const set = <K extends keyof SymptomFormState>(key: K, val: SymptomFormState[K]) =>
    setSymptomState(prev => ({ ...prev, [key]: val }));

  const toggleSymptomType = (id: number) =>
    set('symptomTypeIds',
      symptomState.symptomTypeIds.includes(id)
        ? symptomState.symptomTypeIds.filter(x => x !== id)
        : [...symptomState.symptomTypeIds, id]
    );

  if (mode === 'view') {
    const anyData = symptomState.painLevel != null || symptomState.brainFogLevel != null
      || symptomState.fatigueLevel != null || symptomState.symptomTypeIds.length > 0
      || symptomState.hadCrash || symptomState.hadAnxiety;
    if (!hasSymptomData && !anyData) return <p className="empty-state">Symptoms not logged yet.</p>;

    return (
      <div>
        {/* Core severity ratings — consistent x/MAX format */}
        {[
          { emoji: '🤕', label: 'Pain',      v: symptomState.painLevel },
          { emoji: '🌫️', label: 'Brain Fog', v: symptomState.brainFogLevel },
          { emoji: '😴', label: 'Fatigue',   v: symptomState.fatigueLevel },
        ].map(m => (
          <div key={m.label} className="metric-display">
            <span className="metric-display__emoji">{m.emoji}</span>
            <span className="metric-display__label">{m.label}</span>
            <Rating value={m.v} />
          </div>
        ))}

        {/* Crash */}
        {symptomState.hadCrash && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0 }}>
              ⚡ Crash{symptomState.crashSeverity != null ? ` · ${symptomState.crashSeverity}/${SEVERITY_MAX}` : ''}
              {symptomState.crashTiming ? ` · ${symptomState.crashTiming}` : ''}
            </p>
          </div>
        )}

        {/* Anxiety */}
        {symptomState.hadAnxiety && (
          <div style={{ marginTop: 6 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--warn)', margin: 0 }}>
              😰 Anxiety{symptomState.anxietySeverity != null ? ` · ${symptomState.anxietySeverity}/${SEVERITY_MAX}` : ''}
            </p>
            {symptomState.anxietyDetail && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0', fontStyle: 'italic' }}>
                {symptomState.anxietyDetail}
              </p>
            )}
          </div>
        )}

        {/* Symptom types grouped by category */}
        {reference.symptomCategories.map(cat => {
          const activeInCat = cat.types.filter(t => symptomState.symptomTypeIds.includes(t.id));
          if (activeInCat.length === 0) return null;
          return (
            <CardSection key={cat.id}>
              <CardSectionLabel>{cat.category_name}</CardSectionLabel>
              <ChipGroup>
                {activeInCat.map(t => (
                  <Chip key={t.id} active small style={{ cursor: 'default' }}>{t.symptom_name}</Chip>
                ))}
              </ChipGroup>
            </CardSection>
          );
        })}

        {/* Notes */}
        {symptomState.backgroundNotes && (
          <CardSection>
            <CardSectionLabel>Background</CardSectionLabel>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              {symptomState.backgroundNotes}
            </p>
          </CardSection>
        )}
        {symptomState.whatHelped && (
          <CardSection>
            <CardSectionLabel>What helped</CardSectionLabel>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              {symptomState.whatHelped}
            </p>
          </CardSection>
        )}

        {symptomState.flagProvider && (
          <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: 8 }}>🚩 Flagged for provider</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <CardSection>
        <SliderField emoji="🤕" label="Pain Level"  value={symptomState.painLevel}     min={0} max={10} onChange={v => set('painLevel', v)} />
        <SliderField emoji="🌫️" label="Brain Fog"   value={symptomState.brainFogLevel} min={0} max={10} onChange={v => set('brainFogLevel', v)} />
        <SliderField emoji="😴" label="Fatigue"     value={symptomState.fatigueLevel}  min={0} max={10} onChange={v => set('fatigueLevel', v)} />
      </CardSection>

      <CardSection>
        <Toggle label="Crash" checked={symptomState.hadCrash} onChange={() => set('hadCrash', !symptomState.hadCrash)} />
        {symptomState.hadCrash && (
          <div className="conditional-block">
            <SliderField emoji="⚡" label="Severity" value={symptomState.crashSeverity} min={0} max={10} onChange={v => set('crashSeverity', v)} />
            <InputField label="Timing" id="crash-timing">
              <input id="crash-timing" type="text" value={symptomState.crashTiming} onChange={e => set('crashTiming', e.target.value)} placeholder="Morning, afternoon…" />
            </InputField>
          </div>
        )}
      </CardSection>

      <CardSection>
        <Toggle label="Notable anxiety" checked={symptomState.hadAnxiety} onChange={() => set('hadAnxiety', !symptomState.hadAnxiety)} />
        {symptomState.hadAnxiety && (
          <div className="conditional-block">
            <SliderField emoji="😰" label="Severity" value={symptomState.anxietySeverity} min={0} max={10} onChange={v => set('anxietySeverity', v)} />
            <InputField label="Detail" id="anxiety-detail">
              <textarea id="anxiety-detail" value={symptomState.anxietyDetail} onChange={e => set('anxietyDetail', e.target.value)} placeholder="What triggered it…" style={{ minHeight: 60 }} />
            </InputField>
          </div>
        )}
      </CardSection>

      {/* Symptom types per category — fully data-driven */}
      {reference.symptomCategories.map(cat => (
        <CardSection key={cat.id}>
          <CardSectionLabel>{cat.category_name}</CardSectionLabel>
          <ChipGroup>
            {cat.types.map(t => (
              <Chip
                key={t.id}
                active={symptomState.symptomTypeIds.includes(t.id)}
                onClick={() => toggleSymptomType(t.id)}
              >
                {t.symptom_name}
              </Chip>
            ))}
          </ChipGroup>
        </CardSection>
      ))}

      <CardSection>
        <CardSectionLabel>Notes</CardSectionLabel>
        <InputField label="Background / context" id="background-notes">
          <textarea id="background-notes" value={symptomState.backgroundNotes} onChange={e => set('backgroundNotes', e.target.value)} placeholder="What was happening…" />
        </InputField>
        <InputField label="What helped" id="what-helped">
          <textarea id="what-helped" value={symptomState.whatHelped} onChange={e => set('whatHelped', e.target.value)} placeholder="What helped?" style={{ minHeight: 60 }} />
        </InputField>
      </CardSection>

      <CardSection>
        <Toggle label="Flag for provider" checked={symptomState.flagProvider} onChange={() => set('flagProvider', !symptomState.flagProvider)} />
      </CardSection>
    </div>
  );
}

// ── Meds tab ──────────────────────────────────────────────────────────────────

function MedsContent({ mode, entryId, prescriptions, prescriptionIds: initialIds }: {
  mode: Mode;
  entryId: number;
  prescriptions: PrescriptionDetail[];
  prescriptionIds: number[];
}) {
  const supabase = createClient();
  const [takenIds, setTakenIds] = useState<number[]>(initialIds);
  const [pending,  setPending]  = useState<Set<number>>(new Set());

  const toggle = useCallback(async (prescriptionId: number) => {
    if (pending.has(prescriptionId)) return;
    const nowTaken = !takenIds.includes(prescriptionId);
    setTakenIds(prev => nowTaken ? [...prev, prescriptionId] : prev.filter(id => id !== prescriptionId));
    setPending(prev => new Set(prev).add(prescriptionId));
    try {
      await togglePrescriptionEntry(supabase, entryId, prescriptionId, nowTaken);
    } catch {
      setTakenIds(prev => nowTaken ? prev.filter(id => id !== prescriptionId) : [...prev, prescriptionId]);
    } finally {
      setPending(prev => { const next = new Set(prev); next.delete(prescriptionId); return next; });
    }
  }, [supabase, entryId, takenIds, pending]);

  if (prescriptions.length === 0) return <p className="empty-state">No active prescriptions found.</p>;

  if (mode === 'view') {
    const taken    = prescriptions.filter(rx => takenIds.includes(rx.id));
    const notTaken = prescriptions.filter(rx => !takenIds.includes(rx.id));
    return (
      <div>
        {taken.length > 0 && (
          <CardSection>
            <CardSectionLabel>Taken</CardSectionLabel>
            {taken.map(rx => (
              <div key={rx.id} className="prescription-item prescription-item--taken" style={{ cursor: 'default' }}>
                <div className="prescription-item__check">✓</div>
                <div>
                  <div className="prescription-item__name">{rx.alias ?? rx.medication.medication_name}</div>
                  <div className="prescription-item__timing">{rx.dose ? `${rx.dose} · ` : ''}{rx.timing_type?.timing_name ?? ''}</div>
                </div>
              </div>
            ))}
          </CardSection>
        )}
        {notTaken.length > 0 && (
          <CardSection>
            <CardSectionLabel>Not taken</CardSectionLabel>
            {notTaken.map(rx => (
              <div key={rx.id} className="prescription-item" style={{ cursor: 'default', opacity: 0.5 }}>
                <div className="prescription-item__check" />
                <div>
                  <div className="prescription-item__name">{rx.alias ?? rx.medication.medication_name}</div>
                  <div className="prescription-item__timing">{rx.dose ? `${rx.dose} · ` : ''}{rx.timing_type?.timing_name ?? ''}</div>
                </div>
              </div>
            ))}
          </CardSection>
        )}
        {taken.length === 0 && notTaken.length === 0 && (
          <p className="empty-state">No prescriptions logged.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
        Tap to mark as taken today.
      </p>
      {prescriptions.map(rx => {
        const taken = takenIds.includes(rx.id);
        return (
          <button
            key={rx.id}
            type="button"
            className={`prescription-item${taken ? ' prescription-item--taken' : ''}`}
            onClick={() => toggle(rx.id)}
            disabled={pending.has(rx.id)}
          >
            <div className="prescription-item__check">{taken && '✓'}</div>
            <div>
              <div className="prescription-item__name">{rx.alias ?? rx.medication.medication_name}</div>
              <div className="prescription-item__timing">{rx.dose ? `${rx.dose} · ` : ''}{rx.timing_type?.timing_name ?? ''}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── ESS tab ───────────────────────────────────────────────────────────────────

function EssContent({ entryId, ess, questionTypes, answerTypes, mode }: {
  entryId: number;
  ess: EssEntryDetail | null;
  questionTypes: EssQuestionTypeRow[];
  answerTypes:   EssAnswerTypeRow[];
  mode: Mode;
}) {
  const supabase = createClient();
  const initialResponses: Record<number, number> = {};
  ess?.responses.forEach(r => { initialResponses[r.question_type_id] = r.answer_type_id; });
  const [responses, setResponses] = useState<Record<number, number>>(initialResponses);
  const [saving,    setSaving]    = useState<Set<number>>(new Set());

  const liveTotal = Object.entries(responses).reduce((sum, [, aId]) => {
    const answer = answerTypes.find(a => a.id === Number(aId));
    return sum + (answer?.answer_value ?? 0);
  }, 0);

  const interp = liveTotal <= 10 ? { label: 'Normal',   color: 'var(--success)' }
               : liveTotal <= 15 ? { label: 'Mild',     color: 'var(--warn)' }
               : liveTotal <= 20 ? { label: 'Moderate', color: 'var(--danger)' }
               :                   { label: 'Severe',   color: 'var(--danger)' };

  const sortedAnswers = [...answerTypes].sort((a, b) => a.answer_value - b.answer_value);

  const selectAnswer = async (questionTypeId: number, answerTypeId: number) => {
    if (saving.has(questionTypeId)) return;
    setResponses(prev => ({ ...prev, [questionTypeId]: answerTypeId }));
    setSaving(prev => new Set(prev).add(questionTypeId));
    try {
      await setEssResponse(supabase, entryId, questionTypeId, answerTypeId);
    } catch {
      setResponses(prev => {
        const next = { ...prev };
        const prior = ess?.responses.find(r => r.question_type_id === questionTypeId);
        if (prior) next[questionTypeId] = prior.answer_type_id;
        else delete next[questionTypeId];
        return next;
      });
    } finally {
      setSaving(prev => { const next = new Set(prev); next.delete(questionTypeId); return next; });
    }
  };

  if (mode === 'view') {
    if (!ess || Object.keys(responses).length === 0) return <p className="empty-state">ESS not completed yet.</p>;
    return (
      <div className="ess-score">
        <div className="ess-score__number" style={{ color: interp.color }}>{liveTotal}</div>
        <div className="ess-score__label">{interp.label} · {Object.keys(responses).length}/{questionTypes.length} answered</div>
      </div>
    );
  }

  return (
    <div>
      <div className="ess-score">
        <div className="ess-score__number" style={{ color: interp.color }}>{liveTotal}</div>
        <div className="ess-score__label">{interp.label} · {Object.keys(responses).length}/{questionTypes.length} answered</div>
      </div>
      {questionTypes.map(q => {
        const selectedId = responses[q.id];
        return (
          <div key={q.id} className={`ess-question${selectedId != null ? ' ess-question--answered' : ''}`}>
            <p className="ess-question__text">{q.question_label}</p>
            <div className="ess-answer-grid">
              {sortedAnswers.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`ess-answer${selectedId === a.id ? ' ess-answer--selected' : ''}`}
                  onClick={() => selectAnswer(q.id, a.id)}
                  disabled={saving.has(q.id)}
                >
                  <span className="ess-answer__value">{a.answer_value}</span>
                  <span className="ess-answer__label">{a.answer_label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 12, textAlign: 'center' }}>
        Answers save automatically.
      </p>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function HealthLogCard({
  mode, entryId, date, sleepState, setSleepState, hasSleepData,
  symptomState, setSymptomState, hasSymptomData, priorSleep,
  ess, prescriptions, prescriptionIds, reference,
}: Props) {
  const [tab, setTab] = useState<Tab>('sleep');

  return (
    <Card>
      <CardHeader>
        <CardTitle>🩺 Health Log</CardTitle>
      </CardHeader>
      <CardBody>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'sleep' && (
          <SleepContent
            mode={mode}
            sleepState={sleepState}
            setSleepState={setSleepState}
            hasSleepData={hasSleepData}
            priorSleep={priorSleep}
            reference={reference}
          />
        )}

        {tab === 'symptoms' && (
          <SymptomsContent
            mode={mode}
            symptomState={symptomState}
            setSymptomState={setSymptomState}
            hasSymptomData={hasSymptomData}
            reference={reference}
          />
        )}

        {tab === 'meds' && (
          <MedsContent
            mode={mode}
            entryId={entryId}
            prescriptions={prescriptions}
            prescriptionIds={prescriptionIds}
          />
        )}

        {tab === 'ess' && (
          <EssContent
            entryId={entryId}
            ess={ess}
            questionTypes={reference.essQuestionTypes}
            answerTypes={reference.essAnswerTypes}
            mode={mode}
          />
        )}
      </CardBody>
    </Card>
  );
}
