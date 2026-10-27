'use client';

/**
 * TrackableInputs — draws a trackable category's trackables for a day, each by
 * its type (TRACKABLE_VIEWS has one entry per track_type).
 *
 *   boolean     tile (saves when tapped)
 *   numeric     slider over the trackable's range
 *   combo       chip; when on, an optional slider
 *   time        date + time
 *   choice      dropdown
 *   short_text  one-line input      long_text  text area
 *   icon        icon picker
 *   tags        tag selector (saves when tapped)
 *   aggregate   its questions (answers save when tapped) and the total
 *   prescription  taken / not taken, with dose and timing (saves when tapped)
 *
 * In view mode every trackable shows, with "–" when nothing was entered.
 * Children (parent_trackable_id) show under their parent when both are in
 * the same category, and only while the parent is "on" (see parentIsOn).
 */

import type { ReactNode } from 'react';
import {
  CardSection, CardSectionLabel, Chip, ChipGroup, ChipSelect, DateTimeField, EmptyState, IconDisplay, IconPicker,
  InputField, Markdown, SelectField, SliderField, TagSelector, TextAreaField, TextField,
} from '@/components/ui';
import { formatShortDate } from '@/lib/utils/dates';
import type { DayValues, PrescriptionDetail, TrackableDetail } from '@/types/dal';
import type { IconRow, TagRow, TrackType } from '@/types/schema';

export type Mode = 'view' | 'input';

/** Value kinds kept in page state until Save. */
export type EditedKind = 'numeric' | 'combo' | 'time' | 'text' | 'icon' | 'choice';

export interface TrackableActions {
  mode:          Mode;
  values:        DayValues;
  icons:         IconRow[];
  tags:          TagRow[];
  /** Every prescription (prescription trackables show dose and timing). */
  prescriptions: PrescriptionDetail[];
  /** Sets (or with undefined, clears) a value saved with the Save button. */
  setValue:      <K extends EditedKind>(kind: K, trackableId: number, value: DayValues[K][number] | undefined) => void;
  toggleBoolean: (trackableId: number) => void;
  toggleTag:     (trackableId: number, tagId: number) => void;
  addTag:        (trackableId: number, value: string) => Promise<void>;
  answer:        (questionId: number, optionId: number | null) => void;
}

const DASH = '–';

/** Slider range; trackables made before ranges existed fall back to 0–10. */
const rangeOf = (t: TrackableDetail) => ({
  min:  Number(t.range?.range_min ?? 0),
  max:  Number(t.range?.range_max ?? 10),
  step: Number(t.range?.range_step ?? 1),
});

function Rating({ value, max }: Readonly<{ value: number | null | undefined; max: number }>) {
  if (value == null) return <span className="metric-display__value metric-display__value--empty">{DASH}</span>;
  return (
    <span className="metric-display__value">
      {value}<span className="metric-display__value-denom">/{max}</span>
    </span>
  );
}

function ShowRow({ t, icon, children }: Readonly<{ t: TrackableDetail; icon: IconRow | null; children: ReactNode }>) {
  return (
    <div className="metric-display">
      <IconDisplay icon={icon} size="sm" className="metric-display__emoji" />
      <span className="metric-display__label">{t.name}</span>
      {children}
    </div>
  );
}

const textValue = (v: string | undefined | null) =>
  <span className={`metric-display__value${v ? '' : ' metric-display__value--empty'}`}>{v || DASH}</span>;

// ── One trackable, by type ───────────────────────────────────────────────────

type View = (t: TrackableDetail, a: TrackableActions) => ReactNode;

const iconOf = (a: TrackableActions, id: number | null | undefined) => a.icons.find(i => i.id === id) ?? null;

const TRACKABLE_VIEWS: Record<TrackType, View> = {
  // Booleans, combos and prescriptions are drawn in groups (see Run).
  boolean:      () => null,
  combo:        () => null,
  prescription: () => null,

  numeric: (t, a) => {
    const { min, max, step } = rangeOf(t);
    const value = a.values.numeric[t.id];
    return a.mode === 'view'
      ? <ShowRow key={t.id} t={t} icon={iconOf(a, t.icon_id)}><Rating value={value} max={max} /></ShowRow>
      : <SliderField key={t.id} emoji={<IconDisplay icon={iconOf(a, t.icon_id)} size="sm" />} label={t.name}
          value={value ?? null} min={min} max={max} step={step}
          onChange={v => a.setValue('numeric', t.id, v)} />;
  },

  time: (t, a) => {
    const value = a.values.time[t.id];
    return a.mode === 'view'
      ? <ShowRow key={t.id} t={t} icon={iconOf(a, t.icon_id)}>{textValue(value ? formatShortDate(value) : null)}</ShowRow>
      : <DateTimeField key={t.id} label={t.name} value={value ?? ''}
          onChange={v => a.setValue('time', t.id, v || undefined)} />;
  },

  choice: (t, a) => {
    const value = a.values.choice[t.id];
    // Active options, plus the saved one if it has since been deactivated.
    const options = t.choice_options.filter(o => o.is_active || o.option_id === value);
    return a.mode === 'view'
      ? <ShowRow key={t.id} t={t} icon={iconOf(a, t.icon_id)}>
          {textValue(t.choice_options.find(o => o.option_id === value)?.value)}
        </ShowRow>
      : <SelectField key={t.id} label={t.name} value={value ?? ''} placeholder={DASH}
          options={options.map(o => ({ value: o.option_id, label: o.value }))}
          onChange={v => a.setValue('choice', t.id, v ? Number(v) : undefined)} />;
  },

  short_text: (t, a) => {
    const value = a.values.text[t.id];
    return a.mode === 'view'
      ? <ShowRow key={t.id} t={t} icon={iconOf(a, t.icon_id)}>{textValue(value)}</ShowRow>
      : <TextField key={t.id} label={t.name} value={value ?? ''}
          onChange={v => a.setValue('text', t.id, v)} />;
  },

  long_text: (t, a) => {
    const value = a.values.text[t.id];
    return a.mode === 'view'
      ? (
        <div key={t.id} className="trackable-long-text">
          <CardSectionLabel>{t.name}</CardSectionLabel>
          {value
            ? <div className="detail-page__body-markdown"><Markdown>{value}</Markdown></div>
            : textValue(null)}
        </div>
      )
      : <TextAreaField key={t.id} label={t.name} value={value ?? ''}
          onChange={v => a.setValue('text', t.id, v)} />;
  },

  icon: (t, a) => {
    const value = a.values.icon[t.id];
    return a.mode === 'view'
      ? <ShowRow key={t.id} t={t} icon={iconOf(a, t.icon_id)}>
          {value != null
            ? <span className="metric-display__value"><IconDisplay icon={iconOf(a, value)} size="md" /></span>
            : textValue(null)}
        </ShowRow>
      : (
        <InputField key={t.id} label={t.name} id={`trackable-icon-${t.id}`}>
          <IconPicker icons={a.icons} value={value ?? null} size="sm"
            onChange={id => a.setValue('icon', t.id, id ?? undefined)} />
        </InputField>
      );
  },

  tags: (t, a) => {
    const selected = a.values.tags[t.id] ?? [];
    return a.mode === 'view'
      ? (
        <div key={t.id}>
          <CardSectionLabel>{t.name}</CardSectionLabel>
          {selected.length
            ? <ChipGroup>{a.tags.filter(g => selected.includes(g.id)).map(g => <Chip key={g.id} active small>{g.tag_value}</Chip>)}</ChipGroup>
            : textValue(null)}
        </div>
      )
      : (
        <div key={t.id}>
          <CardSectionLabel>{t.name}</CardSectionLabel>
          <TagSelector allTags={a.tags} selectedIds={selected}
            onToggle={tagId => a.toggleTag(t.id, tagId)}
            onAdd={value => a.addTag(t.id, value)} />
        </div>
      );
  },

  aggregate: (t, a) => <Aggregate key={t.id} t={t} a={a} />,
};

// ── Aggregate (questions + total) ────────────────────────────────────────────

function Aggregate({ t, a }: Readonly<{ t: TrackableDetail; a: TrackableActions }>) {
  const answered  = t.questions.filter(q => a.values.aggregate[q.id] != null);
  const shown     = t.questions.filter(q => q.is_active || a.values.aggregate[q.id] != null);
  const valueOf   = (qId: number) => t.questions.find(q => q.id === qId)?.options
    .find(o => o.option_id === a.values.aggregate[qId])?.value ?? 0;
  const total     = answered.reduce((sum, q) => sum + valueOf(q.id), 0);
  const max       = t.questions.filter(q => q.is_active)
    .reduce((sum, q) => sum + Math.max(0, ...q.options.filter(o => o.is_active).map(o => o.value)), 0);

  const score = (
    <div className="ess-score">
      <div className="ess-score__number">{answered.length ? total : DASH}</div>
      <div className="ess-score__label">{t.name} · {answered.length}/{shown.length} answered · max {max}</div>
    </div>
  );

  if (a.mode === 'view') return score;

  return (
    <div>
      {score}
      {shown.map(q => {
        const selected = a.values.aggregate[q.id];
        const options  = q.options.filter(o => o.is_active || o.option_id === selected);
        return (
          <div key={q.id} className={`ess-question${selected != null ? ' ess-question--answered' : ''}`}>
            <p className="ess-question__text">{q.question}</p>
            <div className="ess-answer-grid">
              {options.map(o => (
                <button key={o.id} type="button"
                  className={`ess-answer${selected === o.option_id ? ' ess-answer--selected' : ''}`}
                  aria-pressed={selected === o.option_id}
                  // Tapping the chosen answer again clears it.
                  onClick={() => a.answer(q.id, selected === o.option_id ? null : o.option_id)}>
                  <span className="ess-answer__value">{o.value}</span>
                  <span className="ess-answer__label">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="daily-card__ess-footnote">Answers save automatically.</p>
    </div>
  );
}

// ── Groups: yes/no tiles and combo chips ─────────────────────────────────────

function BooleanTiles({ items, a }: Readonly<{ items: TrackableDetail[]; a: TrackableActions }>) {
  return (
    <div className="habit-grid">
      {items.map(t => {
        const done = a.values.boolean.includes(t.id);
        const content = (
          <>
            <IconDisplay icon={iconOf(a, t.icon_id)} size="sm" className="habit-btn__emoji" />
            <span className="habit-btn__label">{t.name}</span>
          </>
        );
        return a.mode === 'view'
          ? <div key={t.id} className={`habit-btn${done ? ' habit-btn--done' : ''}`}>{content}</div>
          : (
            <button key={t.id} type="button" aria-pressed={done}
              className={`habit-btn${done ? ' habit-btn--done' : ''}`}
              onClick={() => a.toggleBoolean(t.id)}>
              {content}
            </button>
          );
      })}
    </div>
  );
}

function ComboChips({ items, a }: Readonly<{ items: TrackableDetail[]; a: TrackableActions }>) {
  const on = items.filter(t => t.id in a.values.combo);

  if (a.mode === 'view') {
    return on.length
      ? (
        <ChipGroup>
          {on.map(t => {
            const v = a.values.combo[t.id];
            return <Chip key={t.id} active small>{t.name}{v != null ? ` · ${v}/${rangeOf(t).max}` : ''}</Chip>;
          })}
        </ChipGroup>
      )
      : <EmptyState>None.</EmptyState>;
  }

  return (
    <>
      <ChipSelect
        small={false}
        options={items.map(t => ({ value: t.id, label: t.name }))}
        selected={on.map(t => t.id)}
        onToggle={(id, yes) => a.setValue('combo', id, yes ? null : undefined)}
      />
      {on.map(t => {
        const { min, max, step } = rangeOf(t);
        return (
          <SliderField key={t.id} emoji={<IconDisplay icon={iconOf(a, t.icon_id)} size="sm" />} label={t.name}
            value={a.values.combo[t.id] ?? null} min={min} max={max} step={step}
            onChange={v => a.setValue('combo', t.id, v)} />
        );
      })}
    </>
  );
}

function PrescriptionItems({ items, a }: Readonly<{ items: TrackableDetail[]; a: TrackableActions }>) {
  return (
    <div>
      {items.map(t => {
        const taken = a.values.boolean.includes(t.id);
        const rx    = a.prescriptions.find(p => p.id === t.prescription_id);
        const meta  = rx ? `${rx.dose ? `${rx.dose} · ` : ''}${rx.timing_type?.timing_name ?? ''}` : '';
        const body  = (
          <>
            <div className="prescription-item__check">{taken && '✓'}</div>
            <div>
              <div className="prescription-item__name">{t.name}</div>
              {meta && <div className="prescription-item__timing">{meta}</div>}
            </div>
          </>
        );
        return a.mode === 'view'
          ? <div key={t.id} className={`prescription-item ${taken ? 'prescription-item--taken' : 'prescription-item--dim'}`}>{body}</div>
          : (
            <button key={t.id} type="button" aria-pressed={taken}
              className={`prescription-item${taken ? ' prescription-item--taken' : ''}`}
              onClick={() => a.toggleBoolean(t.id)}>
              {body}
            </button>
          );
      })}
    </div>
  );
}

// ── A category ───────────────────────────────────────────────────────────────

/** Draws a run of trackables: consecutive booleans as one tile grid,
 *  consecutive combos as one chip group, consecutive prescriptions as one
 *  list, the rest one by one. */
function Run({ items, a }: Readonly<{ items: TrackableDetail[]; a: TrackableActions }>) {
  const out: ReactNode[] = [];
  for (let i = 0; i < items.length;) {
    const type = items[i].track_type;
    if (type === 'boolean' || type === 'combo' || type === 'prescription') {
      let j = i;
      while (j < items.length && items[j].track_type === type) j++;
      const group = items.slice(i, j);
      const key   = `${type}${items[i].id}`;
      out.push(
        type === 'boolean' ? <BooleanTiles key={key} items={group} a={a} />
        : type === 'combo' ? <ComboChips key={key} items={group} a={a} />
        : <PrescriptionItems key={key} items={group} a={a} />);
      i = j;
    } else {
      out.push(TRACKABLE_VIEWS[type](items[i], a));
      i++;
    }
  }
  return <>{out}</>;
}

/**
 * Whether a parent trackable is "on", so its children show: yes/no and
 * prescriptions ticked, a combo chip on, a slider above 0, text / a time /
 * an icon / a choice entered, a tag picked, a question answered.
 */
function parentIsOn(t: TrackableDetail, v: DayValues): boolean {
  switch (t.track_type) {
    case 'boolean':
    case 'prescription': return v.boolean.includes(t.id);
    case 'combo':        return t.id in v.combo;
    case 'numeric':      return (v.numeric[t.id] ?? 0) > 0;
    case 'time':         return Boolean(v.time[t.id]);
    case 'short_text':
    case 'long_text':    return Boolean(v.text[t.id]?.trim());
    case 'icon':         return v.icon[t.id] != null;
    case 'choice':       return v.choice[t.id] != null;
    case 'tags':         return (v.tags[t.id] ?? []).length > 0;
    case 'aggregate':    return t.questions.some(q => v.aggregate[q.id] != null);
  }
}

export function CategoryTrackables({ label, trackables, a }: Readonly<{
  /** Category name (shown as the section label). */
  label:      string;
  /** The category's active trackables, in category order. */
  trackables: TrackableDetail[];
  a:          TrackableActions;
}>) {
  const ids = new Set(trackables.map(t => t.id));
  // Children whose parent is in this category are drawn under the parent.
  const isNested = (t: TrackableDetail) => t.parent_trackable_id != null && ids.has(t.parent_trackable_id);
  const top = trackables.filter(t => !isNested(t));

  // Consecutive top-level trackables are drawn together; a parent with
  // children ends the run so its children can follow it.
  const blocks: ReactNode[] = [];
  let run: TrackableDetail[] = [];
  const flush = () => { if (run.length) blocks.push(<Run key={`r${run[0].id}`} items={run} a={a} />); run = []; };
  for (const t of top) {
    const children = trackables.filter(c => c.parent_trackable_id === t.id);
    run.push(t);
    if (children.length && parentIsOn(t, a.values)) {
      flush();
      blocks.push(
        <div key={`k${t.id}`} className="conditional-block">
          <Run items={children} a={a} />
        </div>,
      );
    }
  }
  flush();

  return (
    <CardSection>
      <CardSectionLabel>{label}</CardSectionLabel>
      {trackables.length ? blocks : <EmptyState>No trackables in this category yet.</EmptyState>}
    </CardSection>
  );
}
