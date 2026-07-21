'use client';

/**
 * components/daily-log/DailyCard.tsx
 *
 * Merged daily + health log card.
 * Six tabs: Overview | Metrics | Symptoms | Sleep | Meds | ESS
 *
 * Replaces DailyLogCard + HealthLogCard.
 */

import { useState, useCallback } from 'react';
import { createClient }    from '@/lib/supabase/client';
import { togglePrescriptionEntry } from '@/lib/dal/daily';
import { setEssResponse }          from '@/lib/dal/ess';

import { Card, CardHeader, CardTitle, CardBody, CardSection, CardSectionLabel } from '@/components/ui/Card';
import { TabBar }          from '@/components/ui/Controls';
import { Toggle }          from '@/components/ui/Controls';
import { SliderField }     from '@/components/ui/SliderField';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { InputField, Field } from '@/components/ui/Display';

import { TagSelector }   from '@/components/ui/TagSelector';
import type {
  DailyEntryDetail, SleepEntryDetail, DailySymptomData,
  EssEntryDetail, PrescriptionDetail, PriorSleepContext, ReferenceData,
} from '@/types/dal';
import type { EssQuestionTypeRow, EssAnswerTypeRow } from '@/types/schema';
import type {
  DailyOverviewState, SymptomFormState, SleepFormState, MetricState,
} from './DailyPageClient';

type Mode = 'view' | 'input';

const TABS = [
  { id: 'overview',  label: '📋 Overview'  },
  { id: 'metrics',   label: '📊 Metrics'   },
  { id: 'symptoms',  label: '🩺 Symptoms'  },
  { id: 'sleep',     label: '💤 Sleep'     },
  { id: 'meds',      label: '💊 Meds'      },
  { id: 'ess',       label: '😴 ESS'       },
] as const satisfies { id: string; label: string }[];

type TabId = typeof TABS[number]['id'];

const SEVERITY_MAX = 10;

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function Rating({ value, max = SEVERITY_MAX }: { value: number | null | undefined; max?: number }) {
  if (value == null) return <span className="metric-display__value metric-display__value--empty">–</span>;
  return (
    <span className="metric-display__value">
      {value}<span className="metric-display__value-denom">/{max}</span>
    </span>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  mode, state, setState,
  trackables, checkedTrackableIds, toggleBoolean,
  tags, tagIds, toggleTag, addNewTag,
}: {
  mode: Mode;
  state: DailyOverviewState;
  setState: React.Dispatch<React.SetStateAction<DailyOverviewState>>;
  trackables: ReferenceData['trackables'];
  checkedTrackableIds: number[];
  toggleBoolean: (id: number) => void;
  tags: ReferenceData['tags'];
  tagIds: number[];
  toggleTag: (id: number) => void;
  addNewTag: (v: string) => Promise<void>;
}) {
  const set = <K extends keyof DailyOverviewState>(k: K, v: DailyOverviewState[K]) =>
    setState(prev => ({ ...prev, [k]: v }));

  const booleanTrackables = trackables.filter(t => t.track_type === 'boolean');
  const activeTags = tags.filter(t => tagIds.includes(t.id));

  if (mode === 'view') {
    return (
      <div>
        <CardSection>
          <CardSectionLabel>Habits</CardSectionLabel>
          <div className="habit-grid">
            {booleanTrackables.map(t => (
              <div
                key={t.id}
                className={`habit-btn${checkedTrackableIds.includes(t.id) ? ' habit-btn--done' : ''}`}
              >
                <span className="habit-btn__emoji">{t.emoji ?? '•'}</span>
                <span className="habit-btn__label">{t.name}</span>
              </div>
            ))}
          </div>
        </CardSection>

        {(state.word || state.dailyEmoji) && (
          <CardSection>
            <div className="summary-row">
              <span className="summary-row__label">Word</span>
              <span className={`summary-row__value${!state.word ? ' summary-row__value--empty' : ''}`}>
                {state.word || '—'}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Emoji</span>
              <span className={`summary-row__value${!state.dailyEmoji ? ' summary-row__value--empty' : ''}`}>
                {state.dailyEmoji || '—'}
              </span>
            </div>
          </CardSection>
        )}

        {state.summary && (
          <CardSection>
            <CardSectionLabel>Summary</CardSectionLabel>
            <p className="daily-card__summary-text">{state.summary}</p>
          </CardSection>
        )}

        {activeTags.length > 0 && (
          <CardSection>
            <CardSectionLabel>Tags</CardSectionLabel>
            <ChipGroup>
              {activeTags.map(t => <Chip key={t.id} active small>{t.tag_value}</Chip>)}
            </ChipGroup>
          </CardSection>
        )}

        {state.brainDump && (
          <CardSection>
            <CardSectionLabel>Brain Dump</CardSectionLabel>
            <p className="daily-card__brain-dump-preview">
              {state.brainDump.slice(0, 160)}{state.brainDump.length > 160 ? '…' : ''}
            </p>
          </CardSection>
        )}
      </div>
    );
  }

  return (
    <div>
      <CardSection>
        <CardSectionLabel>Habits</CardSectionLabel>
        <div className="habit-grid">
          {booleanTrackables.map(t => (
            <button
              key={t.id}
              type="button"
              className={`habit-btn${checkedTrackableIds.includes(t.id) ? ' habit-btn--done' : ''}`}
              onClick={() => toggleBoolean(t.id)}
            >
              <span className="habit-btn__emoji">{t.emoji ?? '•'}</span>
              <span className="habit-btn__label">{t.name}</span>
            </button>
          ))}
        </div>
      </CardSection>

      <CardSection>
        <div className="field-grid">
          <InputField label="Word of the day" id="word">
            <input
              id="word" type="text"
              value={state.word}
              placeholder="One word…"
              onChange={e => set('word', e.target.value)}
            />
          </InputField>
          <InputField label="Daily emoji" id="daily-emoji">
            <input
              id="daily-emoji" type="text"
              value={state.dailyEmoji}
              placeholder="🌟"
              onChange={e => set('dailyEmoji', e.target.value)}
            />
          </InputField>
        </div>
        <InputField label="Summary" id="summary">
          <textarea
            id="summary"
            value={state.summary}
            placeholder="How did today go?"
            onChange={e => set('summary', e.target.value)}
            className="textarea--short"
          />
        </InputField>
      </CardSection>

      <CardSection>
        <CardSectionLabel>Tags</CardSectionLabel>
        <TagSelector
          allTags={tags}
          selectedIds={tagIds}
          onToggle={toggleTag}
          onAdd={addNewTag}
        />
      </CardSection>

      <CardSection>
        <InputField label="Brain dump" id="brain-dump">
          <textarea
            id="brain-dump"
            value={state.brainDump}
            placeholder="Anything on your mind…"
            onChange={e => set('brainDump', e.target.value)}
          />
        </InputField>
      </CardSection>
    </div>
  );
}

// ── Metrics tab ───────────────────────────────────────────────────────────────

function MetricsTab({
  mode, trackables, metricState, setMetricState,
}: {
  mode: Mode;
  trackables: ReferenceData['trackables'];
  metricState: MetricState;
  setMetricState: React.Dispatch<React.SetStateAction<MetricState>>;
}) {
  const numericTrackables = trackables.filter(t => t.track_type === 'numeric');

  if (!numericTrackables.length) {
    return <p className="empty-state">No numeric metrics configured.</p>;
  }

  if (mode === 'view') {
    return (
      <div>
        {numericTrackables.map(t => (
          <div key={t.id} className="metric-display">
            <span className="metric-display__emoji">{t.emoji ?? '•'}</span>
            <span className="metric-display__label">{t.name}</span>
            <Rating value={metricState[t.id] ?? null} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {numericTrackables.map(t => (
        <SliderField
          key={t.id}
          emoji={t.emoji ?? '•'}
          label={t.name}
          value={metricState[t.id] ?? null}
          min={0}
          max={SEVERITY_MAX}
          onChange={v => setMetricState(prev => ({ ...prev, [t.id]: v }))}
        />
      ))}
    </div>
  );
}

// ── Symptoms tab ──────────────────────────────────────────────────────────────

function SymptomsTab({
  mode, state, setState, hasSymptomData, reference,
}: {
  mode: Mode;
  state: SymptomFormState;
  setState: React.Dispatch<React.SetStateAction<SymptomFormState>>;
  hasSymptomData: boolean;
  reference: ReferenceData;
}) {
  const set = <K extends keyof SymptomFormState>(k: K, v: SymptomFormState[K]) =>
    setState(prev => ({ ...prev, [k]: v }));

  const toggleSymptomType = (id: number) =>
    set('symptomTypeIds',
      state.symptomTypeIds.includes(id)
        ? state.symptomTypeIds.filter(x => x !== id)
        : [...state.symptomTypeIds, id]
    );

  if (mode === 'view') {
    const anyData = state.symptomTypeIds.length > 0 || state.hadCrash || state.hadAnxiety;
    if (!hasSymptomData && !anyData) return <p className="empty-state">No symptoms logged.</p>;

    return (
      <div>
        {state.hadCrash && (
          <p className="daily-card__crash-line">
            ⚡ Crash{state.crashSeverity != null ? ` · ${state.crashSeverity}/${SEVERITY_MAX}` : ''}
            {state.crashTiming ? ` · ${state.crashTiming}` : ''}
          </p>
        )}
        {state.hadAnxiety && (
          <div>
            <p className="daily-card__anxiety-line">
              😰 Anxiety{state.anxietySeverity != null ? ` · ${state.anxietySeverity}/${SEVERITY_MAX}` : ''}
            </p>
            {state.anxietyDetail && (
              <p className="daily-card__anxiety-detail">{state.anxietyDetail}</p>
            )}
          </div>
        )}
        {reference.symptomCategories.map(cat => {
          const active = cat.types.filter(t => state.symptomTypeIds.includes(t.id));
          if (!active.length) return null;
          return (
            <CardSection key={cat.id}>
              <CardSectionLabel>{cat.category_name}</CardSectionLabel>
              <ChipGroup>
                {active.map(t => <Chip key={t.id} active small>{t.symptom_name}</Chip>)}
              </ChipGroup>
            </CardSection>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <CardSection>
        <Toggle label="Crash" checked={state.hadCrash} onChange={() => set('hadCrash', !state.hadCrash)} />
        {state.hadCrash && (
          <div className="conditional-block">
            <SliderField emoji="⚡" label="Severity" value={state.crashSeverity} min={0} max={SEVERITY_MAX}
              onChange={v => set('crashSeverity', v)} />
            <InputField label="Timing" id="crash-timing">
              <input id="crash-timing" type="text" value={state.crashTiming}
                placeholder="Morning, afternoon…" onChange={e => set('crashTiming', e.target.value)} />
            </InputField>
          </div>
        )}
      </CardSection>

      <CardSection>
        <Toggle label="Notable anxiety" checked={state.hadAnxiety}
          onChange={() => set('hadAnxiety', !state.hadAnxiety)} />
        {state.hadAnxiety && (
          <div className="conditional-block">
            <SliderField emoji="😰" label="Severity" value={state.anxietySeverity} min={0} max={SEVERITY_MAX}
              onChange={v => set('anxietySeverity', v)} />
            <InputField label="Detail" id="anxiety-detail">
              <textarea id="anxiety-detail" value={state.anxietyDetail}
                onChange={e => set('anxietyDetail', e.target.value)}
                placeholder="What triggered it…" className="textarea--short" />
            </InputField>
          </div>
        )}
      </CardSection>

      {reference.symptomCategories.map(cat => (
        <CardSection key={cat.id}>
          <CardSectionLabel>{cat.category_name}</CardSectionLabel>
          <ChipGroup>
            {cat.types.map(t => (
              <Chip key={t.id} active={state.symptomTypeIds.includes(t.id)}
                onClick={() => toggleSymptomType(t.id)}>
                {t.symptom_name}
              </Chip>
            ))}
          </ChipGroup>
        </CardSection>
      ))}
    </div>
  );
}

// ── Meds tab ─────────────────────────────────────────────────────────────────

function MedsTab({
  mode, entryId, prescriptions, prescriptionIds: initialIds,
}: {
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

  if (!prescriptions.length) return <p className="empty-state">No active prescriptions.</p>;

  if (mode === 'view') {
    const taken    = prescriptions.filter(rx => takenIds.includes(rx.id));
    const notTaken = prescriptions.filter(rx => !takenIds.includes(rx.id));
    return (
      <div>
        {taken.length > 0 && (
          <CardSection>
            <CardSectionLabel>Taken</CardSectionLabel>
            {taken.map(rx => (
              <div key={rx.id} className="prescription-item prescription-item--taken">
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
              <div key={rx.id} className="prescription-item prescription-item--dim">
                <div className="prescription-item__check" />
                <div>
                  <div className="prescription-item__name">{rx.alias ?? rx.medication.medication_name}</div>
                  <div className="prescription-item__timing">{rx.dose ? `${rx.dose} · ` : ''}{rx.timing_type?.timing_name ?? ''}</div>
                </div>
              </div>
            ))}
          </CardSection>
        )}
      </div>
    );
  }

  return (
    <div>
      {prescriptions.map(rx => {
        const taken = takenIds.includes(rx.id);
        return (
          <button key={rx.id} type="button"
            className={`prescription-item${taken ? ' prescription-item--taken' : ''}`}
            onClick={() => toggle(rx.id)} disabled={pending.has(rx.id)}>
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

function EssTab({
  entryId, ess, questionTypes, answerTypes, mode,
}: {
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

  const answerValueById = new Map(answerTypes.map(a => [a.id, a.answer_value]));
  const liveTotal = Object.values(responses).reduce(
    (sum, aId) => sum + (answerValueById.get(aId) ?? 0), 0
  );

  // ESS_MAX computed from data: questions × max answer value
  const essMax = questionTypes.length * Math.max(...answerTypes.map(a => a.answer_value), 0);

  const interp =
    liveTotal <= 10 ? { label: 'Normal',   color: 'var(--success)' } :
    liveTotal <= 15 ? { label: 'Mild',     color: 'var(--warn)'    } :
    liveTotal <= 20 ? { label: 'Moderate', color: 'var(--danger)'  } :
                      { label: 'Severe',   color: 'var(--danger)'  };

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
    if (!ess || !Object.keys(responses).length) return <p className="empty-state">ESS not completed.</p>;
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
                <button key={a.id} type="button"
                  className={`ess-answer${selectedId === a.id ? ' ess-answer--selected' : ''}`}
                  onClick={() => selectAnswer(q.id, a.id)} disabled={saving.has(q.id)}>
                  <span className="ess-answer__value">{a.answer_value}</span>
                  <span className="ess-answer__label">{a.answer_label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="daily-card__ess-footnote">Answers save automatically. Max: {essMax}</p>
    </div>
  );
}

// ── Sleep tab is substantial — keeping as inline (same as HealthLogCard) ──────
// (omitted here for brevity: import SleepTab from HealthLogCard or inline it)
// For now, a placeholder that shows the existing sleep content

function SleepTab({
  mode, sleepState, setSleepState, hasSleepData, priorSleep, reference,
}: {
  mode: Mode;
  sleepState: SleepFormState;
  setSleepState: React.Dispatch<React.SetStateAction<SleepFormState>>;
  hasSleepData: boolean;
  priorSleep: PriorSleepContext | null;
  reference: ReferenceData;
}) {
  const set = <K extends keyof SleepFormState>(k: K, v: SleepFormState[K]) =>
    setSleepState(prev => ({ ...prev, [k]: v }));

  if (mode === 'view') {
    const noData = !hasSleepData && sleepState.quality == null && !sleepState.hoursSlept;
    if (noData) return <p className="empty-state">Sleep not logged.</p>;

    // Lookup helpers
    const eventNames   = sleepState.sleepEventIds.map(id =>
      reference.sleepEventTypes.find(t => t.id === id)?.type_name ?? String(id)
    );
    const consumeNames = sleepState.consumptionIds.map(id =>
      reference.consumptionTypes.find(t => t.id === id)?.type_name ?? String(id)
    );
    const timingRows = Object.entries(sleepState.timingMap).map(([catIdStr, optId]) => {
      const catId = Number(catIdStr);
      const cat   = reference.timingCategories.find(c => c.id === catId);
      const opt   = reference.timingOptions.find(o => o.id === optId);
      return cat && opt ? { cat: cat.category_name, opt: opt.option_name } : null;
    }).filter(Boolean) as { cat: string; opt: string }[];

    const hasTonightContext =
      timingRows.length > 0 || consumeNames.length > 0 || sleepState.preBedActivity;

    // Prior night lookups
    const priorConsumeNames = priorSleep?.consumption_ids.map(id =>
      reference.consumptionTypes.find(t => t.id === id)?.type_name ?? String(id)
    ) ?? [];
    const priorTimingRows = (priorSleep?.timing_entries ?? []).map(te => {
      const cat = reference.timingCategories.find(c => c.id === te.timing_category_id);
      const opt = reference.timingOptions.find(o => o.id === te.timing_option_id);
      return cat && opt ? { cat: cat.category_name, opt: opt.option_name } : null;
    }).filter(Boolean) as { cat: string; opt: string }[];
    const hasPriorContext =
      priorTimingRows.length > 0 || priorConsumeNames.length > 0 ||
      !!priorSleep?.today_pre_bed_activity;

    return (
      <div>
        {/* ── Core metrics ── */}
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
            <span className="metric-display__value">
              {formatTime(sleepState.bedtime) || '?'} → {formatTime(sleepState.wakeTime) || '?'}
            </span>
          </div>
        )}
        {sleepState.latencyMin && (
          <div className="metric-display">
            <span className="metric-display__emoji">💤</span>
            <span className="metric-display__label">Latency</span>
            <span className="metric-display__value">{sleepState.latencyMin} min</span>
          </div>
        )}
        {sleepState.osaCount && (
          <div className="metric-display">
            <span className="metric-display__emoji">😮‍💨</span>
            <span className="metric-display__label">OSA events/hr</span>
            <span className="metric-display__value">{sleepState.osaCount}</span>
          </div>
        )}
        {sleepState.inertiaSeverity != null && (
          <div className="metric-display">
            <span className="metric-display__emoji">😵</span>
            <span className="metric-display__label">Morning inertia</span>
            <Rating value={sleepState.inertiaSeverity} />
          </div>
        )}

        {/* ── Wake events ── */}
        {sleepState.wakeCount > 0 && (
          <CardSection>
            <CardSectionLabel>Wake events</CardSectionLabel>
            <div className="sleep-view__detail-row">
              <span>Count: {sleepState.wakeCount}</span>
              {sleepState.wakeMins && <span>· {sleepState.wakeMins} min total</span>}
            </div>
            {sleepState.wakeDetail && (
              <p className="sleep-view__detail-text">{sleepState.wakeDetail}</p>
            )}
          </CardSection>
        )}

        {/* ── Nap ── */}
        {sleepState.hadNap && (
          <CardSection>
            <CardSectionLabel>Nap</CardSectionLabel>
            <div className="sleep-view__detail-row">
              {sleepState.napDuration && <span>{sleepState.napDuration} min</span>}
              <span>· {sleepState.napRefresh ? 'refreshing' : 'not refreshing'}</span>
            </div>
          </CardSection>
        )}

        {/* ── Sleep events ── */}
        {eventNames.length > 0 && (
          <CardSection>
            <CardSectionLabel>Sleep events</CardSectionLabel>
            <ChipGroup>
              {eventNames.map(name => <Chip key={name} active small>{name}</Chip>)}
            </ChipGroup>
          </CardSection>
        )}

        {/* ── Tonight's context ── */}
        {hasTonightContext && (
          <CardSection>
            <CardSectionLabel>Tonight's context</CardSectionLabel>
            {timingRows.map(r => (
              <div key={r.cat} className="sleep-view__context-row">
                <span className="sleep-view__context-label">{r.cat}</span>
                <span className="sleep-view__context-value">{r.opt}</span>
              </div>
            ))}
            {consumeNames.length > 0 && (
              <div className="sleep-view__context-row">
                <span className="sleep-view__context-label">Consumed</span>
                <span className="sleep-view__context-value">{consumeNames.join(', ')}</span>
              </div>
            )}
            {sleepState.preBedActivity && (
              <div className="sleep-view__context-row">
                <span className="sleep-view__context-label">Activity</span>
                <span className="sleep-view__context-value">{sleepState.preBedActivity}</span>
              </div>
            )}
          </CardSection>
        )}

        {/* ── Notes ── */}
        {sleepState.notes && (
          <CardSection>
            <CardSectionLabel>Notes</CardSectionLabel>
            <p className="daily-card__summary-text">{sleepState.notes}</p>
          </CardSection>
        )}

        {/* ── Previous night context ── */}
        {hasPriorContext && (
          <CardSection>
            <CardSectionLabel>Previous night</CardSectionLabel>
            {priorTimingRows.map(r => (
              <div key={r.cat} className="sleep-view__context-row">
                <span className="sleep-view__context-label">{r.cat}</span>
                <span className="sleep-view__context-value">{r.opt}</span>
              </div>
            ))}
            {priorConsumeNames.length > 0 && (
              <div className="sleep-view__context-row">
                <span className="sleep-view__context-label">Consumed</span>
                <span className="sleep-view__context-value">{priorConsumeNames.join(', ')}</span>
              </div>
            )}
            {priorSleep?.today_pre_bed_activity && (
              <div className="sleep-view__context-row">
                <span className="sleep-view__context-label">Activity</span>
                <span className="sleep-view__context-value">{priorSleep.today_pre_bed_activity}</span>
              </div>
            )}
          </CardSection>
        )}
      </div>
    );
  }

  return (
    <div>
      {priorSleep && (
        <div className="prior-context">
          <p className="prior-context__title">Prior night</p>
          {priorSleep.today_pre_bed_activity && (
            <p className="prior-context__text">Activity: {priorSleep.today_pre_bed_activity}</p>
          )}
        </div>
      )}

      <CardSection>
        <SliderField emoji="⭐" label="Sleep Quality" value={sleepState.quality}
          min={1} max={SEVERITY_MAX} onChange={v => set('quality', v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Times</CardSectionLabel>
        <div className="field-grid">
          <InputField label="Bedtime" id="bedtime">
            <input id="bedtime" type="time" value={sleepState.bedtime}
              onChange={e => set('bedtime', e.target.value)} />
          </InputField>
          <InputField label="Wake time" id="wake-time">
            <input id="wake-time" type="time" value={sleepState.wakeTime}
              onChange={e => set('wakeTime', e.target.value)} />
          </InputField>
        </div>
        <div className="field-grid field-grid--3">
          <InputField label="Hours" id="hours-slept">
            <input id="hours-slept" type="number" min={0} max={24} step={0.25}
              value={sleepState.hoursSlept} placeholder="7.5"
              onChange={e => set('hoursSlept', e.target.value)} />
          </InputField>
          <InputField label="Latency (min)" id="latency">
            <input id="latency" type="number" min={0}
              value={sleepState.latencyMin} placeholder="20"
              onChange={e => set('latencyMin', e.target.value)} />
          </InputField>
          <InputField label="OSA events/hr" id="osa">
            <input id="osa" type="number" min={0} step={0.1}
              value={sleepState.osaCount} placeholder="0.0"
              onChange={e => set('osaCount', e.target.value)} />
          </InputField>
        </div>
        <SliderField emoji="😵" label="Morning inertia" value={sleepState.inertiaSeverity}
          min={0} max={10} onChange={v => set('inertiaSeverity', v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Wake events ({sleepState.wakeCount})</CardSectionLabel>
        <SliderField emoji="😤" label="Count" value={sleepState.wakeCount}
          min={0} max={10} onChange={v => set('wakeCount', v)} />
        {sleepState.wakeCount > 0 && (
          <div className="conditional-block">
            <div className="field-grid">
              <InputField label="Duration (min)" id="wake-mins">
                <input id="wake-mins" type="number" min={0} value={sleepState.wakeMins}
                  onChange={e => set('wakeMins', e.target.value)} />
              </InputField>
            </div>
            <InputField label="Detail" id="wake-detail">
              <input id="wake-detail" type="text" value={sleepState.wakeDetail}
                placeholder="What woke you?" onChange={e => set('wakeDetail', e.target.value)} />
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
                <input id="nap-duration" type="number" min={0} value={sleepState.napDuration}
                  onChange={e => set('napDuration', e.target.value)} />
              </InputField>
            </div>
            <Toggle label="Refreshing" checked={sleepState.napRefresh}
              onChange={() => set('napRefresh', !sleepState.napRefresh)} />
          </div>
        )}
      </CardSection>

      <CardSection>
        <CardSectionLabel>Sleep events</CardSectionLabel>
        <div className="toggle-grid">
          {reference.sleepEventTypes.map(t => (
            <Toggle key={t.id} label={t.type_name}
              checked={sleepState.sleepEventIds.includes(t.id)}
              onChange={() => set('sleepEventIds',
                sleepState.sleepEventIds.includes(t.id)
                  ? sleepState.sleepEventIds.filter(id => id !== t.id)
                  : [...sleepState.sleepEventIds, t.id]
              )}
            />
          ))}
        </div>
      </CardSection>

      <CardSection>
        <CardSectionLabel>Tonight's context</CardSectionLabel>
        {reference.timingCategories.map(cat => (
          <div key={cat.id} className="daily-card__timing-group">
            <p className="card__section-label">{cat.category_name}</p>
            <ChipGroup>
              {reference.timingOptions.map(opt => (
                <Chip key={opt.id} active={sleepState.timingMap[cat.id] === opt.id} small
                  onClick={() => set('timingMap', { ...sleepState.timingMap, [cat.id]: opt.id })}>
                  {opt.option_name}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        ))}
        <p className="card__section-label card__section-label--spaced">Pre-bed consumption</p>
        <ChipGroup>
          {reference.consumptionTypes.map(t => (
            <Chip key={t.id} active={sleepState.consumptionIds.includes(t.id)} small
              onClick={() => set('consumptionIds',
                sleepState.consumptionIds.includes(t.id)
                  ? sleepState.consumptionIds.filter(id => id !== t.id)
                  : [...sleepState.consumptionIds, t.id]
              )}>
              {t.type_name}
            </Chip>
          ))}
        </ChipGroup>
        <div className="daily-card__timing-group">
          <InputField label="Pre-bed activity" id="pre-bed-activity">
            <input id="pre-bed-activity" type="text" value={sleepState.preBedActivity}
              onChange={e => set('preBedActivity', e.target.value)}
              placeholder="What did you do before bed?" />
          </InputField>
        </div>
      </CardSection>

      <CardSection>
        <CardSectionLabel>Notes</CardSectionLabel>
        <textarea value={sleepState.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Anything notable…" className="textarea--short" />
      </CardSection>
    </div>
  );
}

// ── DailyCard (main export) ───────────────────────────────────────────────────

interface Props {
  mode: Mode;
  entry: DailyEntryDetail;
  date: string;

  overviewState: DailyOverviewState;
  setOverviewState: React.Dispatch<React.SetStateAction<DailyOverviewState>>;

  metricState: MetricState;
  setMetricState: React.Dispatch<React.SetStateAction<MetricState>>;

  checkedTrackableIds: number[];
  toggleBoolean: (id: number) => void;

  tagIds: number[];
  toggleTag: (id: number) => void;
  addNewTag: (v: string) => Promise<void>;

  sleepState: SleepFormState;
  setSleepState: React.Dispatch<React.SetStateAction<SleepFormState>>;
  hasSleepData: boolean;

  symptomState: SymptomFormState;
  setSymptomState: React.Dispatch<React.SetStateAction<SymptomFormState>>;
  hasSymptomData: boolean;

  priorSleep: PriorSleepContext | null;
  ess: EssEntryDetail | null;
  prescriptions: PrescriptionDetail[];
  reference: ReferenceData;
}

export function DailyCard({
  mode, entry, date,
  overviewState, setOverviewState,
  metricState, setMetricState,
  checkedTrackableIds, toggleBoolean,
  tagIds, toggleTag, addNewTag,
  sleepState, setSleepState, hasSleepData,
  symptomState, setSymptomState, hasSymptomData,
  priorSleep, ess, prescriptions, reference,
}: Props) {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Daily Entry</CardTitle>
      </CardHeader>
      <CardBody>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <OverviewTab
            mode={mode}
            state={overviewState}
            setState={setOverviewState}
            trackables={reference.trackables}
            checkedTrackableIds={checkedTrackableIds}
            toggleBoolean={toggleBoolean}
            tags={reference.tags}
            tagIds={tagIds}
            toggleTag={toggleTag}
            addNewTag={addNewTag}
          />
        )}

        {tab === 'metrics' && (
          <MetricsTab
            mode={mode}
            trackables={reference.trackables}
            metricState={metricState}
            setMetricState={setMetricState}
          />
        )}

        {tab === 'symptoms' && (
          <SymptomsTab
            mode={mode}
            state={symptomState}
            setState={setSymptomState}
            hasSymptomData={hasSymptomData}
            reference={reference}
          />
        )}

        {tab === 'sleep' && (
          <SleepTab
            mode={mode}
            sleepState={sleepState}
            setSleepState={setSleepState}
            hasSleepData={hasSleepData}
            priorSleep={priorSleep}
            reference={reference}
          />
        )}

        {tab === 'meds' && (
          <MedsTab
            mode={mode}
            entryId={entry.id}
            prescriptions={prescriptions}
            prescriptionIds={entry.prescription_ids}
          />
        )}

        {tab === 'ess' && (
          <EssTab
            entryId={entry.id}
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
