'use client';

/**
 * components/daily-log/DailyCard.tsx
 *
 * Merged daily + health log card.
 * Six tabs: Overview | Metrics | Symptoms | Sleep | Meds | ESS
 *
 * Replaces DailyLogCard + HealthLogCard.
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient }    from '@/lib/supabase/client';
import { togglePrescriptionEntry } from '@/lib/dal/daily';
import { setEssResponse }          from '@/lib/dal/ess';
import { formatTime } from '@/lib/utils/dates';
import { Card, CardHeader, CardTitle, CardBody, CardSection, CardSectionLabel, TabBar, Toggle, SliderField, Chip, ChipGroup, InputField, SaveState, TextField, NumberField, TimeField, TextAreaField, IconDisplay, IconPicker, Markdown, TagSelector, EmptyState, ChipSelect, FieldGrid } from '@/components/ui';
import { JournalTab }       from './JournalTab';
import type {
  JournalCategoryWithPrompts,
  EssEntryDetail, PrescriptionDetail, PriorSleepContext, ReferenceData,
} from '@/types/dal';
import type {  JournalState, DailyOverviewState, SymptomFormState, SleepFormState, MetricState, } from './DailyPageClient';
import type { EssQuestionTypeRow, EssAnswerTypeRow, IconRow } from '@/types/schema';
import { DAILY_TABS, DailyTabId, toDailyTabId } from '@/lib/constants/nav';

type Mode = 'view' | 'input';

const SEVERITY_MAX = 10;

function Rating({ value, max = SEVERITY_MAX }: Readonly<{ value: number | null | undefined; max?: number }>) {
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
  tags, tagIds, toggleTag, addNewTag,
  icons,
}: Readonly<{
  mode: Mode;
  state: DailyOverviewState;
  setState: React.Dispatch<React.SetStateAction<DailyOverviewState>>;
  tags: ReferenceData['tags'];
  tagIds: number[];
  toggleTag: (id: number) => void;
  addNewTag: (v: string) => Promise<void>;
  icons:               IconRow[];
}>) {
  const set = <K extends keyof DailyOverviewState>(k: K, v: DailyOverviewState[K]) =>
    setState(prev => ({ ...prev, [k]: v }));

  const activeTags = tags.filter(t => tagIds.includes(t.id));

  if (mode === 'view') {
    return (
      <div>
        {state.summary && (
          <CardSection>
            <CardSectionLabel>Summary</CardSectionLabel>
            <div className="detail-page__body-markdown">
                <Markdown>{state.summary}</Markdown>
            </div>
          </CardSection>
        )}
      
        {(state.word || state.dailyIconId != null) && (
          <CardSection>
            <div className="summary-row">
              <span className="summary-row__label">Word</span>
              <span className={`summary-row__value${!state.word ? ' summary-row__value--empty' : ''}`}>
                {state.word || '—'}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Emoji</span>
              <span className="summary-row__value">
                <IconDisplay
                icon={icons.find(i => i.id === state.dailyIconId) ?? null}
                  size="md"
                />
              </span>
            </div>
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
        <TextAreaField label="Summary" value={state.summary} placeholder="How did today go? What did you do?"
          onChange={v => set('summary', v)} size="tall" />
        <FieldGrid>
          <TextField label="Word of the day" value={state.word} placeholder="One word…"
            onChange={v => set('word', v)} />
          <InputField label="Daily icon" id="daily-icon">
            <IconPicker
              icons={icons}
              value={state.dailyIconId}
              onChange={id => set('dailyIconId', id)}
              size="sm"
            />
          </InputField>
        </FieldGrid>
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
        <TextAreaField label="Brain dump" value={state.brainDump} placeholder="Anything on your mind…"
          onChange={v => set('brainDump', v)} />
      </CardSection>
    </div>
  );
}

// ── Trackables tab ────────────────────────────────────────────────────────────
// Every trackable, grouped by category in the same order as Settings → Metrics:
// within a category, the Yes/No tiles first (they save as soon as they're
// tapped), then the 0–10 sliders (saved with the Save button).

function TrackablesTab({
  mode, trackables, trackableCategories, checkedTrackableIds, toggleBoolean,
  metricState, setMetricState, icons,
}: Readonly<{
  mode: Mode;
  trackables: ReferenceData['trackables'];
  trackableCategories: ReferenceData['trackableCategories'];
  checkedTrackableIds: number[];
  toggleBoolean: (id: number) => void;
  metricState: MetricState;
  setMetricState: React.Dispatch<React.SetStateAction<MetricState>>;
  icons: IconRow[];
}>) {
  const iconOf = (id: number | null) => icons.find(i => i.id === id) ?? null;
  const shown  = trackables.filter(t => t.track_type === 'boolean' || t.track_type === 'numeric');

  if (!shown.length) {
    return <EmptyState>No trackables yet. Add them in Settings → Tracking.</EmptyState>;
  }

  type Group = { key: string; label: string; items: typeof shown };
  const bySort = (a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
  const groups: Group[] = [...trackableCategories]
    .filter(c => c.is_active)
    .sort(bySort)
    .map(c => ({ key: String(c.id), label: c.category_name, items: shown.filter(t => t.category_id === c.id) }));
  const activeCatIds = new Set(trackableCategories.filter(c => c.is_active).map(c => c.id));
  groups.push({
    key: 'other', label: groups.some(g => g.items.length) ? 'Other' : '',
    items: shown.filter(t => t.category_id == null || !activeCatIds.has(t.category_id)),
  });

  return (
    <div>
      {groups.filter(g => g.items.length).map(group => {
        const tiles   = group.items.filter(t => t.track_type === 'boolean').sort(bySort);
        const sliders = group.items.filter(t => t.track_type === 'numeric').sort(bySort);
        return (
          <CardSection key={group.key}>
            {group.label && <CardSectionLabel>{group.label}</CardSectionLabel>}

            {tiles.length > 0 && (
              <div className="habit-grid">
                {tiles.map(t => {
                  const done = checkedTrackableIds.includes(t.id);
                  return mode === 'view' ? (
                    <div key={t.id} className={`habit-btn${done ? ' habit-btn--done' : ''}`}>
                      <IconDisplay icon={iconOf(t.icon_id)} size="sm" className="habit-btn__emoji" />
                      <span className="habit-btn__label">{t.name}</span>
                    </div>
                  ) : (
                    <button key={t.id} type="button" aria-pressed={done}
                      className={`habit-btn${done ? ' habit-btn--done' : ''}`}
                      onClick={() => toggleBoolean(t.id)}>
                      <IconDisplay icon={iconOf(t.icon_id)} size="sm" className="habit-btn__emoji" />
                      <span className="habit-btn__label">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {sliders.map(t => mode === 'view' ? (
              <div key={t.id} className="metric-display">
                <IconDisplay icon={iconOf(t.icon_id)} size="sm" className="metric-display__emoji" />
                <span className="metric-display__label">{t.name}</span>
                <Rating value={metricState[t.id] ?? null} />
              </div>
            ) : (
              <SliderField
                key={t.id}
                emoji={<IconDisplay icon={iconOf(t.icon_id)} size="sm" />}
                label={t.name}
                value={metricState[t.id] ?? null}
                min={0}
                max={SEVERITY_MAX}
                onChange={v => setMetricState(prev => ({ ...prev, [t.id]: v }))}
              />
            ))}
          </CardSection>
        );
      })}
    </div>
  );
}

// ── Symptoms tab ──────────────────────────────────────────────────────────────

function SymptomsTab({
  mode, state, setState, hasSymptomData, reference,
}: Readonly<{
  mode: Mode;
  state: SymptomFormState;
  setState: React.Dispatch<React.SetStateAction<SymptomFormState>>;
  hasSymptomData: boolean;
  reference: ReferenceData;
}>) {
  const set = <K extends keyof SymptomFormState>(k: K, v: SymptomFormState[K]) =>
    setState(prev => ({ ...prev, [k]: v }));

  const toggleSymptomType = (id: number) =>
    set('symptomTypeIds',
      state.symptomTypeIds.includes(id)
        ? state.symptomTypeIds.filter(x => x !== id)
        : [...state.symptomTypeIds, id]
    );

  if (mode === 'view') {
    const anyData = state.symptomTypeIds.length > 0 || state.hadCrash;
    if (!hasSymptomData && !anyData) return <EmptyState>No symptoms logged.</EmptyState>;

    return (
      <div>
        {state.hadCrash && (
          <p className="daily-card__crash-line">
            ⚡ Crash{state.crashSeverity != null ? ` · ${state.crashSeverity}/${SEVERITY_MAX}` : ''}
            {state.crashTiming ? ` · ${state.crashTiming}` : ''}
          </p>
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
            <TextField label="Timing" value={state.crashTiming} placeholder="Morning, afternoon…"
              onChange={v => set('crashTiming', v)} />
          </div>
        )}
      </CardSection>

      {reference.symptomCategories.map(cat => (
        <CardSection key={cat.id}>
          <CardSectionLabel>{cat.category_name}</CardSectionLabel>
          <ChipSelect
            label={cat.category_name}
            small={false}
            options={cat.types.map(t => ({ value: t.id, label: t.symptom_name }))}
            selected={state.symptomTypeIds}
            onToggle={id => toggleSymptomType(id)}
          />
        </CardSection>
      ))}
    </div>
  );
}

// ── Meds tab ─────────────────────────────────────────────────────────────────

function MedsTab({
  mode, getEntryId, prescriptions, prescriptionIds: initialIds,
}: Readonly<{
  mode: Mode;
  getEntryId: () => Promise<number>;
  prescriptions: PrescriptionDetail[];
  prescriptionIds: number[];
}>) {
  const supabase = createClient();
  const [takenIds, setTakenIds] = useState<number[]>(initialIds);
  const [pending,  setPending]  = useState<Set<number>>(new Set());

  const toggle = useCallback(async (prescriptionId: number) => {
    if (pending.has(prescriptionId)) return;
    const nowTaken = !takenIds.includes(prescriptionId);
    setTakenIds(prev => nowTaken ? [...prev, prescriptionId] : prev.filter(id => id !== prescriptionId));
    setPending(prev => new Set(prev).add(prescriptionId));
    try {
      await togglePrescriptionEntry(supabase, await getEntryId(), prescriptionId, nowTaken);
    } catch {
      setTakenIds(prev => nowTaken ? prev.filter(id => id !== prescriptionId) : [...prev, prescriptionId]);
    } finally {
      setPending(prev => { const next = new Set(prev); next.delete(prescriptionId); return next; });
    }
  }, [supabase, getEntryId, takenIds, pending]);

  if (!prescriptions.length) return <EmptyState>No active prescriptions.</EmptyState>;

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
  getEntryId, ess, questionTypes, answerTypes, mode,
}: Readonly<{
  getEntryId: () => Promise<number>;
  ess: EssEntryDetail | null;
  questionTypes: EssQuestionTypeRow[];
  answerTypes:   EssAnswerTypeRow[];
  mode: Mode;
}>) {
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
      await setEssResponse(supabase, await getEntryId(), questionTypeId, answerTypeId);
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
    if (!ess || !Object.keys(responses).length) return <EmptyState>ESS not completed.</EmptyState>;
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
}: Readonly<{
  mode: Mode;
  sleepState: SleepFormState;
  setSleepState: React.Dispatch<React.SetStateAction<SleepFormState>>;
  hasSleepData: boolean;
  priorSleep: PriorSleepContext | null;
  reference: ReferenceData;
}>) {
  const set = <K extends keyof SleepFormState>(k: K, v: SleepFormState[K]) =>
    setSleepState(prev => ({ ...prev, [k]: v }));

  // Prior night lookups
  const priorTimingRows = (priorSleep?.timing_entries ?? []).map(te => {
    const cat = reference.timingCategories.find(c => c.id === te.timing_category_id);
    const opt = reference.timingOptions.find(o => o.id === te.timing_option_id);
    return cat && opt ? { cat: cat.category_name, opt: opt.option_name } : null;
  }).filter(Boolean) as { cat: string; opt: string }[];
  
  const hasPriorContext =
    priorTimingRows.length > 0 || !!priorSleep?.today_pre_bed_activity;

  if (mode === 'view') {
    const noData = !hasSleepData && sleepState.quality == null && !sleepState.hoursSlept;
    if (noData) return <EmptyState>Sleep not logged.</EmptyState>;

    // Lookup helpers
    const eventNames   = sleepState.sleepEventIds.map(id =>
      reference.sleepEventTypes.find(t => t.id === id)?.type_name ?? String(id)
    );
    const timingRows = Object.entries(sleepState.timingMap).map(([catIdStr, optId]) => {
      const catId = Number(catIdStr);
      const cat   = reference.timingCategories.find(c => c.id === catId);
      const opt   = reference.timingOptions.find(o => o.id === optId);
      return cat && opt ? { cat: cat.category_name, opt: opt.option_name } : null;
    }).filter(Boolean) as { cat: string; opt: string }[];

    const hasTonightContext =
      timingRows.length > 0 || sleepState.preBedActivity;

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
            {priorSleep?.today_pre_bed_activity && (
              <div className="sleep-view__context-row">
                <span className="sleep-view__context-label">Activity</span>
                <span className="sleep-view__context-value">{priorSleep?.today_pre_bed_activity}</span>
              </div>
            )}
          </CardSection>
        )}
      </div>
    );
  }
  
  /* -- Edit mode ─────────────────────────────────────────────────────────────── */

  return (
    <div>
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
          {priorSleep?.today_pre_bed_activity && (
            <div className="sleep-view__context-row">
              <span className="sleep-view__context-label">Activity</span>
              <span className="sleep-view__context-value">{priorSleep?.today_pre_bed_activity}</span>
            </div>
          )}
        </CardSection>
      )}

      <CardSection>
        <SliderField emoji="⭐" label="Sleep Quality" value={sleepState.quality}
          min={1} max={SEVERITY_MAX} onChange={v => set('quality', v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Times</CardSectionLabel>
        <FieldGrid>
          <TimeField label="Bedtime" value={sleepState.bedtime} onChange={v => set('bedtime', v)} />
          <TimeField label="Wake time" value={sleepState.wakeTime} onChange={v => set('wakeTime', v)} />
        </FieldGrid>
        <FieldGrid columns={3}>
          <NumberField label="Hours" min={0} max={24} step={0.25} value={sleepState.hoursSlept}
            placeholder="7.5" onChange={v => set('hoursSlept', v)} />
          <NumberField label="Latency (min)" min={0} value={sleepState.latencyMin} placeholder="20"
            onChange={v => set('latencyMin', v)} />
          <NumberField label="OSA events/hr" min={0} step={0.1} value={sleepState.osaCount} placeholder="0.0"
            onChange={v => set('osaCount', v)} />
        </FieldGrid>
        <SliderField emoji="😵" label="Morning inertia" value={sleepState.inertiaSeverity}
          min={0} max={10} onChange={v => set('inertiaSeverity', v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Wake events ({sleepState.wakeCount})</CardSectionLabel>
        <SliderField emoji="😤" label="Count" value={sleepState.wakeCount}
          min={0} max={10} onChange={v => set('wakeCount', v)} />
        {sleepState.wakeCount > 0 && (
          <div className="conditional-block">
            <FieldGrid>
              <NumberField label="Duration (min)" min={0} value={sleepState.wakeMins}
                onChange={v => set('wakeMins', v)} />
            </FieldGrid>
            <TextField label="Detail" value={sleepState.wakeDetail} placeholder="What woke you?"
              onChange={v => set('wakeDetail', v)} />
          </div>
        )}
      </CardSection>

      <CardSection>
        <Toggle label="Napped" checked={sleepState.hadNap} onChange={() => set('hadNap', !sleepState.hadNap)} />
        {sleepState.hadNap && (
          <div className="conditional-block">
            <FieldGrid>
              <NumberField label="Duration (min)" min={0} value={sleepState.napDuration}
                onChange={v => set('napDuration', v)} />
            </FieldGrid>
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
        {reference.timingCategories.map(cat => {
          const selected = sleepState.timingMap[cat.id];
          const pick = (optId: number | null) => {
            const next = { ...sleepState.timingMap };
            if (optId == null) delete next[cat.id]; else next[cat.id] = optId;
            set('timingMap', next);
          };
          return (
            <div key={cat.id} className="daily-card__timing-group">
              <CardSectionLabel>{cat.category_name}</CardSectionLabel>
              {/* Pick one: tapping the picked chip unpicks it. */}
              <ChipSelect
                label={cat.category_name}
                options={reference.timingOptions
                  .filter(opt => opt.option_name.toLowerCase() !== 'none')
                  .map(opt => ({ value: opt.id, label: opt.option_name }))}
                selected={selected != null ? [selected] : []}
                onToggle={(id, on) => pick(on ? id : null)}
              />
            </div>
          );
        })}
        <CardSectionLabel spaced>Pre-bed consumption</CardSectionLabel>
        <ChipSelect
          label="Pre-bed consumption"
          options={reference.consumptionTypes
            .filter(t => t.type_name.toLowerCase() !== 'none')
            .map(t => ({ value: t.id, label: t.type_name }))}
          selected={sleepState.consumptionIds}
          onToggle={(id, on) => set('consumptionIds',
            on ? [...sleepState.consumptionIds, id] : sleepState.consumptionIds.filter(x => x !== id))}
          onClear={() => set('consumptionIds', [])}
        />
        <div className="daily-card__timing-group">
          <TextField label="Pre-bed activity" value={sleepState.preBedActivity}
            onChange={v => set('preBedActivity', v)} placeholder="What did you do before bed?" />
        </div>
      </CardSection>

      <CardSection>
        <CardSectionLabel>Notes</CardSectionLabel>
        <TextAreaField hideLabel label="Sleep notes" value={sleepState.notes} onChange={v => set('notes', v)}
          placeholder="Anything notable…" size="short" />
      </CardSection>
    </div>
  );
}

// ── DailyCard (main export) ───────────────────────────────────────────────────

interface Props {
  mode: Mode;
  /** The day's entry id, creating the entry on first use (see DailyPageClient). */
  getEntryId: () => Promise<number>;
  /** Prescriptions already marked taken today. */
  prescriptionIds: number[];
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

  journalState:        JournalState;
  setJournalState:     React.Dispatch<React.SetStateAction<JournalState>>;
  journalCategories:   JournalCategoryWithPrompts[];
  onSaveJournal:       () => Promise<void>;
  journalSaveState:    SaveState;
}

export function DailyCard({
  mode, getEntryId, prescriptionIds, date,
  overviewState, setOverviewState,
  metricState, setMetricState,
  checkedTrackableIds, toggleBoolean,
  tagIds, toggleTag, addNewTag,
  sleepState, setSleepState, hasSleepData,
  symptomState, setSymptomState, hasSymptomData,
  priorSleep, ess, prescriptions, reference,
  journalState, setJournalState, journalCategories, onSaveJournal, journalSaveState,
}: Readonly<Props>) {
  // The open tab follows ?tab= (e.g. /daily/2026-10-21?tab=symptoms from
  // Quick add) and is written back to the URL without a server round trip.
  const tabParam = useSearchParams().get('tab');
  const [tab, setTab] = useState<DailyTabId>(() => toDailyTabId(tabParam) ?? 'overview');

  useEffect(() => {
    const fromUrl = toDailyTabId(tabParam);
    if (fromUrl) setTab(fromUrl);
  }, [tabParam]);

  const selectTab = useCallback((id: DailyTabId) => {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Daily Entry</CardTitle>
      </CardHeader>
      <CardBody>
        <TabBar label="Daily entry sections" tabs={DAILY_TABS} active={tab} onChange={selectTab} />

        {tab === 'overview' && (
          <OverviewTab
            mode={mode}
            state={overviewState}
            setState={setOverviewState}
            tags={reference.tags}
            tagIds={tagIds}
            toggleTag={toggleTag}
            addNewTag={addNewTag}
            icons={reference.icons}
          />
        )}

        {tab === 'trackables' && (
          <TrackablesTab
            mode={mode}
            trackables={reference.trackables}
            trackableCategories={reference.trackableCategories}
            checkedTrackableIds={checkedTrackableIds}
            toggleBoolean={toggleBoolean}
            metricState={metricState}
            setMetricState={setMetricState}
            icons={reference.icons}
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
            getEntryId={getEntryId}
            prescriptions={prescriptions}
            prescriptionIds={prescriptionIds}
          />
        )}

        {tab === 'ess' && (
          <EssTab
            getEntryId={getEntryId}
            ess={ess}
            questionTypes={reference.essQuestionTypes}
            answerTypes={reference.essAnswerTypes}
            mode={mode}
          />
        )}

        {tab === 'journal' && (
          <JournalTab
            mode={mode}
            categories={journalCategories}
            state={journalState}
            setState={setJournalState}
            onSave={onSaveJournal}
            saveState={journalSaveState}
          />
        )}
      </CardBody>
    </Card>
  );
}
