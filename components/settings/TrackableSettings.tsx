'use client';

/**
 * TrackableSettings (Settings → Tracking)
 *
 * - Trackables: every trackable (ManageableList). Name, icon, type and colour
 *   in the row, and a slider range for numeric / combo. ⋯ → Details… for the
 *   rest: type (locked once it has entries), parent, choice options,
 *   aggregate questions and answers.
 * - Categories: each category's trackables, in order (HierarchicalList). A
 *   trackable can be in several categories. Categories are placed on pages
 *   in Settings → Layout.
 */

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { trackableHasEntries } from '@/lib/dal/trackables';
import {
  addTrackable, updateTrackable, toggleTrackable, saveRange, setTrackablePrescription,
  getChoicePool, getAnswerPool,
  addChoiceOption, renameChoiceOption, toggleChoiceOption, reorderChoiceOptions,
  addAggregateQuestion, renameAggregateQuestion, toggleAggregateQuestion, reorderAggregateQuestions,
  addAggregateAnswer, updateAggregateAnswer, toggleAggregateAnswer, reorderAggregateAnswers,
  addTrackableCategory, renameTrackableCategory, toggleTrackableCategory,
  addTrackableLink, moveTrackableLink, removeTrackableLink, reorderTrackableLinks,
  type TrackableFields,
} from '@/lib/dal/trackable-settings';
import { ManageableList }  from './ManageableList';
import { HierarchicalList, type NormalizedChild } from './HierarchicalList';
import type { AddField }   from './FieldInputs';
import { IconDisplay }     from '@/components/ui/IconDisplay';
import { Badge, Hint, CardSection, CardSectionLabel, SelectField, useToast } from '@/components/ui';
import {
  TRACK_TYPES, type TrackType, type TrackableCategoryRow, type TrackableToCategoryRow, type IconRow,
  type TrackableOptionRow, type TrackableAggregateOptionRow,
} from '@/types/schema';
import type { PrescriptionDetail, TrackableDetail } from '@/types/dal';
import type { PersonRow } from '@/types/schema';

// ── Labels and fields ─────────────────────────────────────────────────────────

const TRACK_TYPE_LABEL: Record<TrackType, string> = {
  boolean:    'Yes/No',
  numeric:    'Slider',
  combo:      'Yes/No + slider',
  time:       'Date & time',
  choice:     'Choice',
  short_text: 'Short text',
  long_text:  'Long text',
  icon:       'Icon',
  tags:       'Tags',
  aggregate:  'Questions (total)',
  prescription: 'Prescription',
};

const HAS_RANGE: readonly TrackType[] = ['numeric', 'combo'];
/** Types that chart, so a colour means something. */
const HAS_COLOR: readonly TrackType[] = ['boolean', 'prescription', 'numeric', 'combo', 'aggregate'];

const hasRange = (values: Record<string, string>) => HAS_RANGE.includes(values.track_type as TrackType);
const hasColor = (values: Record<string, string>) => HAS_COLOR.includes(values.track_type as TrackType);

/** A slider's range for its badge: "0–10", or "0–12 by 0.5". */
function rangeLabel(min: unknown, max: unknown, step: unknown): string {
  const by = Number(step ?? 1);
  return `${min ?? '?'}–${max ?? '?'}${by === 1 ? '' : ` by ${by}`}`;
}

const TRACKABLE_FIELDS: AddField[] = [
  { key: 'icon_id', type: 'icon', label: 'Icon' },
  { key: 'name',    type: 'text', label: 'Name', placeholder: 'Trackable name…', required: true },
  {
    key: 'track_type', type: 'select', label: 'Type', defaultValue: 'boolean',
    showInEdit: false,   // changed in Details… (locked once it has entries)
    options: TRACK_TYPES.map(t => ({ value: t, label: TRACK_TYPE_LABEL[t] })),
  },
  // Slider range. In the add row the type is in the values; when editing
  // it's on the item.
  { key: 'range_min',  type: 'number', label: 'Min',  placeholder: 'Min',  width: 64, defaultValue: '0',  showWhen: hasRange },
  { key: 'range_max',  type: 'number', label: 'Max',  placeholder: 'Max',  width: 64, defaultValue: '10', showWhen: hasRange },
  { key: 'range_step', type: 'number', label: 'Step', placeholder: 'Step', width: 64, defaultValue: '1',  showWhen: hasRange },
  { key: 'color_hex',  type: 'color',  label: 'Color', width: 36, required: false, showWhen: hasColor },
];

/** A trackable as a ManageableList row (sorted by name; no drag order). */
type Row = {
  id: number; name: string; is_active: boolean; sort_order: number;
  track_type: TrackType; icon_id: number | null; color_hex: string | null;
  parent_trackable_id: number | null;
  range_min: number | null; range_max: number | null; range_step: number | null;
  prescription_id: number | null;
};

const toRow = (t: TrackableDetail, sortOrder: number): Row => ({
  id: t.id, name: t.name, is_active: t.is_active, sort_order: sortOrder,
  track_type: t.track_type, icon_id: t.icon_id, color_hex: t.color_hex,
  parent_trackable_id: t.parent_trackable_id,
  range_min:  t.range ? Number(t.range.range_min)  : null,
  range_max:  t.range ? Number(t.range.range_max)  : null,
  range_step: t.range ? Number(t.range.range_step) : null,
  prescription_id: t.prescription_id,
});

/** Splits a row payload into the trackable's columns and its range. */
function splitPayload(payload: Record<string, unknown>) {
  const { range_min, range_max, range_step, prescription_id, ...rest } = payload;
  const fields: TrackableFields = {};
  for (const k of ['name', 'track_type', 'icon_id', 'color_hex'] as const) {
    if (k in rest) (fields as Record<string, unknown>)[k] = rest[k];
  }
  const range = range_min != null && range_max != null
    ? { range_min: Number(range_min), range_max: Number(range_max), range_step: Number(range_step ?? 1) || 1 }
    : null;
  // undefined = not in the payload (leave the link alone)
  const prescriptionId = prescription_id === undefined ? undefined
    : prescription_id == null || prescription_id === '' ? null : Number(prescription_id);
  return { fields, range, prescriptionId };
}

/** The prescription picker, shown for prescription trackables (add and edit). */
function prescriptionField(options: { value: string; label: string }[]): AddField {
  return {
    key: 'prescription_id', type: 'select', label: 'Prescription', placeholder: 'Prescription…',
    required: true, options,
    showWhen: v => v.track_type === 'prescription',
  };
}

const NEW_OPTION = 'new';

/** The shared pools: choice options and aggregate answers. */
interface Pools {
  choice:  TrackableOptionRow[];
  answers: TrackableAggregateOptionRow[];
}

// ── Details dialog ────────────────────────────────────────────────────────────

function ChoiceOptionsEditor({ trackable, pool, onPoolAdd, onChange }: Readonly<{
  trackable: TrackableDetail;
  /** Every choice option created so far (shared across trackables). */
  pool:      TrackableOptionRow[];
  onPoolAdd: (option: TrackableOptionRow) => void;
  onChange:  (options: TrackableDetail['choice_options']) => void;
}>) {
  const supabase = createClient();
  // Kept here so every save sees the latest list.
  const [options, setOptions] = useState(trackable.choice_options);
  const update = (next: TrackableDetail['choice_options']) => { setOptions(next); onChange(next); };

  // Pool options this trackable doesn't offer yet, then "new".
  const offered = new Set(options.map(o => o.option_id));
  const pickable = [
    { value: NEW_OPTION, label: '+ New option…' },
    ...pool.filter(o => !offered.has(o.id)).map(o => ({ value: String(o.id), label: o.value })),
  ];

  return (
    <ManageableList
      bare
      nameColumn="option"
      items={options.map(o => ({ id: o.id, option: o.value, name: o.value, is_active: o.is_active, sort_order: o.sort_order }))}
      renderName={item => <>{item.option}</>}
      addFields={[
        { key: 'option', type: 'select', label: 'Option', placeholder: 'Add an option…', required: true,
          showInEdit: false, options: pickable },
        { key: 'name', type: 'text', label: 'New option', placeholder: 'New option…', required: true,
          showInEdit: false, showWhen: v => v.option === NEW_OPTION },
        // Editing renames the pool option (everywhere it's offered).
        { key: 'name', type: 'text', label: 'Option', required: true, showInAdd: false },
      ]}
      dal={{
        add: async (payload, sortOrder) => {
          const picked = pool.find(o => String(o.id) === payload.option);
          const value  = picked ? picked.value : String(payload.name);
          const row = await addChoiceOption(supabase, trackable.id, value, sortOrder);
          if (!picked) onPoolAdd({ id: row.option_id, value: row.value });
          update([...options, row]);
          return { id: row.id, option: row.value, name: row.value, is_active: row.is_active, sort_order: row.sort_order };
        },
        update: async (id, payload) => {
          const option = options.find(o => o.id === id);
          if (!option || payload.name == null) return;
          await renameChoiceOption(supabase, option.option_id, String(payload.name));
          update(options.map(o => o.option_id === option.option_id ? { ...o, value: String(payload.name).trim() } : o));
        },
        toggle: async (id, active) => {
          await toggleChoiceOption(supabase, id, active);
          update(options.map(o => o.id === id ? { ...o, is_active: active } : o));
        },
        reorder: async updates => {
          await reorderChoiceOptions(supabase, updates);
          const order = new Map(updates.map(u => [u.id, u.sort_order]));
          update(options.map(o => order.has(o.id) ? { ...o, sort_order: order.get(o.id)! } : o));
        },
      }}
    />
  );
}

function AggregateEditor({ trackable, pool, onPoolAdd, onChange }: Readonly<{
  trackable: TrackableDetail;
  /** Every answer created so far (shared across questions). */
  pool:      TrackableAggregateOptionRow[];
  onPoolAdd: (answer: TrackableAggregateOptionRow) => void;
  onChange:  (questions: TrackableDetail['questions']) => void;
}>) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [questions, setQuestions] = useState(trackable.questions);
  const update = (next: TrackableDetail['questions']) => { setQuestions(next); onChange(next); };
  // Answer (bridge) id → its pool answer id.
  const optionIdOf = (bridgeId: number) =>
    questions.flatMap(q => q.options).find(o => o.id === bridgeId)?.option_id;

  return (
    <HierarchicalList
      title="Questions"
      description="The total is the sum of the chosen answers' values. Editing an answer changes it on every question that offers it, and in past totals."
      categoryNoun={['question', 'questions']}
      catPlaceholder="New question…"
      initialCategories={trackable.questions.map(q => ({
        id: q.id, name: q.question, is_active: q.is_active, sort_order: q.sort_order,
        children: q.options.map(o => ({
          id: o.id, name: o.label, value: o.value, is_active: o.is_active, sort_order: o.sort_order,
        })),
      }))}
      childFields={[
        // Add: pick an answer from the pool, or "+ New answer…".
        { key: 'answer', type: 'select', label: 'Answer', placeholder: 'Add an answer…', required: true,
          showInEdit: false,
          options: [
            { value: NEW_OPTION, label: '+ New answer…' },
            ...pool.map(a => ({ value: String(a.id), label: `${a.value} · ${a.label}` })),
          ] },
        { key: 'value', type: 'number', label: 'Value', placeholder: 'Value', width: 72, required: true,
          showInEdit: false, showWhen: v => v.answer === NEW_OPTION },
        { key: 'name',  type: 'text',   label: 'Answer', placeholder: 'Answer…', required: true,
          showInEdit: false, showWhen: v => v.answer === NEW_OPTION },
        // Editing changes the pool answer (everywhere it's offered).
        { key: 'value', type: 'number', label: 'Value', placeholder: 'Value', width: 72, required: true, showInAdd: false },
        { key: 'name',  type: 'text',   label: 'Answer', placeholder: 'Answer…', required: true, showInAdd: false },
      ]}
      renderChildName={child => <><Badge>{String(child.value)}</Badge>{child.name}</>}
      dal={{
        addCategory: async (name, sort) => {
          const q = await addAggregateQuestion(supabase, trackable.id, name, sort);
          update([...questions, { ...q, options: [] }]);
          return q;
        },
        updateCategory: async (id, name) => {
          await renameAggregateQuestion(supabase, id, name);
          update(questions.map(q => q.id === id ? { ...q, question: name.trim() } : q));
        },
        toggleCategory: async (id, active) => {
          await toggleAggregateQuestion(supabase, id, active);
          update(questions.map(q => q.id === id ? { ...q, is_active: active } : q));
        },
        reorderCategories: async updates => {
          await reorderAggregateQuestions(supabase, updates);
          const order = new Map(updates.map(u => [u.id, u.sort_order]));
          update(questions.map(q => order.has(q.id) ? { ...q, sort_order: order.get(q.id)! } : q));
        },
        addChild: async (questionId, values, sort) => {
          const picked = pool.find(a => String(a.id) === values.answer);
          const label  = picked ? picked.label : String(values.name);
          const value  = picked ? picked.value : Number(values.value);
          const q = questions.find(x => x.id === questionId);
          if (picked && q?.options.some(o => o.option_id === picked.id)) {
            addToast('That answer is already on this question.', 'error');
            throw new Error('Already on this question');
          }
          const row = await addAggregateAnswer(supabase, questionId!, label, value, sort);
          if (!picked) onPoolAdd({ id: row.option_id, label: row.label, value: row.value });
          update(questions.map(x => x.id === questionId ? { ...x, options: [...x.options, row] } : x));
          return { ...row, name: row.label };
        },
        updateChild: async (id, values) => {
          const optionId = optionIdOf(id);
          if (optionId == null) return;
          const label = String(values.name).trim();
          const value = Number(values.value);
          await updateAggregateAnswer(supabase, optionId, label, value);
          update(questions.map(q => ({
            ...q, options: q.options.map(o => o.option_id === optionId ? { ...o, label, value } : o),
          })));
        },
        toggleChild: async (id, active) => {
          await toggleAggregateAnswer(supabase, id, active);
          update(questions.map(q => ({ ...q, options: q.options.map(o => o.id === id ? { ...o, is_active: active } : o) })));
        },
        reorderChildren: async updates => {
          await reorderAggregateAnswers(supabase, updates);
          const order = new Map(updates.map(u => [u.id, u.sort_order]));
          update(questions.map(q => ({
            ...q, options: q.options.map(o => order.has(o.id) ? { ...o, sort_order: order.get(o.id)! } : o),
          })));
        },
      }}
    />
  );
}

function TrackableDetails({ trackable, all, prescriptions, people, pools, onPoolAdd, onChange }: Readonly<{
  trackable:     TrackableDetail;
  all:           TrackableDetail[];
  prescriptions: PrescriptionDetail[];
  people:        PersonRow[];
  pools:         Pools;
  onPoolAdd:     (pools: Partial<Pools>) => void;
  onChange:      (patch: Partial<TrackableDetail>) => void;
}>) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [hasEntries, setHasEntries] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    trackableHasEntries(supabase, trackable).then(has => { if (!cancelled) setHasEntries(has); });
    return () => { cancelled = true; };
    // Checked once per opened trackable and type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackable.id, trackable.track_type]);

  const hasChildren = all.some(t => t.parent_trackable_id === trackable.id);
  const parents = all.filter(t => t.id !== trackable.id && t.parent_trackable_id == null && t.is_active);

  const save = async (fields: TrackableFields) => {
    try {
      await updateTrackable(supabase, trackable.id, fields);
      onChange(fields);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Couldn’t save', 'error');
    }
  };

  let typeHint: ReactNode = null;
  if (hasEntries === null) typeHint = 'Checking…';
  else if (hasEntries)     typeHint = 'Locked: it has entries.';

  return (
    <div>
      <CardSection>
        <SelectField
          label="Type"
          value={trackable.track_type}
          disabled={hasEntries !== false}
          options={TRACK_TYPES.map(t => ({ value: t, label: TRACK_TYPE_LABEL[t] }))}
          onChange={v => save({ track_type: v as TrackType })}
        />
        {typeHint && <Hint>{typeHint}</Hint>}
        <SelectField
          label="Under (parent)"
          value={trackable.parent_trackable_id ?? ''}
          placeholder="None"
          disabled={hasChildren}
          options={parents.map(t => ({ value: t.id, label: t.name }))}
          onChange={v => save({ parent_trackable_id: v ? Number(v) : null })}
        />
        {hasChildren && <Hint>It has trackables under it, so it can’t go under another.</Hint>}
      </CardSection>

      {trackable.track_type === 'prescription' && (
        <CardSection>
          <SelectField
            label="Prescription"
            value={trackable.prescription_id ?? ''}
            placeholder="None"
            // Active prescriptions, plus the linked one if it's inactive.
            options={prescriptions
              .filter(rx => rx.is_active || rx.id === trackable.prescription_id)
              .map(rx => {
                const person = people.find(p => p.id === rx.person_id)?.person_name;
                return {
                  value: rx.id,
                  label: `${rx.medication.medication_name}${rx.dose ? ` ${rx.dose}` : ''}${person ? ` — ${person}` : ''}${rx.is_active ? '' : ' (inactive)'}`,
                };
              })}
            onChange={async v => {
              const id = v ? Number(v) : null;
              try {
                await setTrackablePrescription(supabase, trackable.id, id);
                onChange({ prescription_id: id });
              } catch (err) {
                addToast(err instanceof Error ? err.message : 'Couldn’t save', 'error');
              }
            }}
          />
          <Hint>Taking it is logged on the daily page like a Yes/No.</Hint>
        </CardSection>
      )}

      {trackable.track_type === 'choice' && (
        <CardSection>
          <CardSectionLabel>Options</CardSectionLabel>
          <Hint tone="warn">Renaming an option renames it on every trackable that offers it.</Hint>
          <ChoiceOptionsEditor trackable={trackable} pool={pools.choice}
            onPoolAdd={o => onPoolAdd({ choice: [...pools.choice, o] })}
            onChange={choice_options => onChange({ choice_options })} />
        </CardSection>
      )}

      {trackable.track_type === 'aggregate' && (
        <AggregateEditor trackable={trackable} pool={pools.answers}
          onPoolAdd={a => onPoolAdd({ answers: [...pools.answers, a] })}
          onChange={questions => onChange({ questions })} />
      )}
    </div>
  );
}

// ── TrackableSettings ─────────────────────────────────────────────────────────

interface Props {
  trackables:  TrackableDetail[];
  /** Every prescription and person, for prescription trackables. */
  prescriptions: PrescriptionDetail[];
  people:      PersonRow[];
  categories:  TrackableCategoryRow[];
  links:       TrackableToCategoryRow[];
  icons:       IconRow[];
  /** Called with the full list whenever trackables change (for charts, Last Time…). */
  onTrackablesChange?: (trackables: TrackableDetail[]) => void;
  /** Called with the full list whenever categories change (for Layout). */
  onCategoriesChange?: (categories: TrackableCategoryRow[]) => void;
}

const NEW = 'new';

export function TrackableSettings({
  trackables: initialTrackables, categories: initialCategories, links: initialLinks, icons,
  prescriptions, people,
  onTrackablesChange, onCategoriesChange,
}: Readonly<Props>) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [trackables, setTrackables] = useState(initialTrackables);
  const [categories, setCategories] = useState(initialCategories);
  const [links,      setLinks]      = useState(initialLinks);
  const [pools,      setPools]      = useState<Pools>({ choice: [], answers: [] });
  useEffect(() => {
    Promise.all([getChoicePool(supabase), getAnswerPool(supabase)])
      .then(([choice, answers]) => setPools({ choice, answers }))
      .catch(err => console.error('Loading the option pools failed', err));
    // Once: later additions are added to the state as they're made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Bumped when a trackable moves between the two lists (activated,
  // deactivated, put in or taken out of every category, added): both lists
  // are redrawn from the current data.
  const [version, setVersion] = useState(0);
  const redraw = () => setVersion(v => v + 1);

  useEffect(() => { onTrackablesChange?.(trackables); }, [trackables, onTrackablesChange]);
  useEffect(() => { onCategoriesChange?.(categories); }, [categories, onCategoriesChange]);

  const patchTrackable = useCallback((id: number, patch: Partial<TrackableDetail>) =>
    setTrackables(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t)), []);

  const byId   = useMemo(() => new Map(trackables.map(t => [t.id, t])), [trackables]);
  const iconOf = (id: unknown) => icons.find(i => i.id === id) ?? null;
  const trackableOfLink = (linkId: number) => links.find(l => l.id === linkId)?.trackable_id;

  /** "Duloxetine (Annie)" for a prescription, else the name. */
  const displayName = (t: TrackableDetail) => {
    if (t.track_type !== 'prescription' || t.prescription_id == null) return t.name;
    const rx = prescriptions.find(p => p.id === t.prescription_id);
    const person = rx && people.find(p => p.id === rx.person_id)?.person_name;
    return person ? `${t.name} (${person})` : t.name;
  };

  // ── Shared pieces of both lists ───────────────────────────────────────────

  const renderTrackable = (t: TrackableDetail | undefined) => {
    if (!t) return <>?</>;
    const parent = t.parent_trackable_id != null ? byId.get(t.parent_trackable_id) : null;
    return (
      <>
        <IconDisplay icon={iconOf(t.icon_id)} size="sm" className="trackable-emoji" />
        {displayName(t)}
        <Badge>
          {HAS_RANGE.includes(t.track_type) && t.range
            ? `${TRACK_TYPE_LABEL[t.track_type]} ${rangeLabel(t.range.range_min, t.range.range_max, t.range.range_step)}`
            : TRACK_TYPE_LABEL[t.track_type]}
        </Badge>
        {parent && <Badge>under {parent.name}</Badge>}
        {typeof t.color_hex === 'string' && (
          // Dynamic colour from data — legitimate inline style exception
          <span className="color-swatch" style={{ background: t.color_hex }} aria-hidden="true" />
        )}
      </>
    );
  };

  const detailsDialog = (trackableId: number | undefined, patchRow: (p: Record<string, unknown>) => void) => {
    const t = trackableId != null ? byId.get(trackableId) : undefined;
    if (!t) return null;
    return (
      <TrackableDetails
        trackable={t}
        all={trackables}
        prescriptions={prescriptions}
        people={people}
        pools={pools}
        onPoolAdd={patch => setPools(prev => ({ ...prev, ...patch }))}
        onChange={change => {
          patchTrackable(t.id, change);
          if (change.track_type) patchRow({ track_type: change.track_type });
        }}
      />
    );
  };

  /** Creates a trackable (and its range) from row values. */
  const createTrackable = async (payload: Record<string, unknown>): Promise<TrackableDetail> => {
    const { fields, range, prescriptionId } = splitPayload(payload);
    const row = await addTrackable(supabase, fields);
    const savedRange = range && HAS_RANGE.includes(row.track_type) ? await saveRange(supabase, row.id, range) : null;
    const rxId = row.track_type === 'prescription' ? prescriptionId ?? null : null;
    if (rxId != null) await setTrackablePrescription(supabase, row.id, rxId);
    const detail: TrackableDetail = { ...row, range: savedRange, choice_options: [], questions: [], prescription_id: rxId };
    setTrackables(prev => [...prev, detail]);
    return detail;
  };

  const editTrackable = async (id: number, payload: Record<string, unknown>) => {
    const { fields, range, prescriptionId } = splitPayload(payload);
    await updateTrackable(supabase, id, fields);
    const savedRange = range ? await saveRange(supabase, id, range) : undefined;
    if (prescriptionId !== undefined) await setTrackablePrescription(supabase, id, prescriptionId);
    patchTrackable(id, {
      ...fields,
      ...(savedRange ? { range: savedRange } : {}),
      ...(prescriptionId !== undefined ? { prescription_id: prescriptionId } : {}),
    });
  };

  // Prescription picker options: "Duloxetine 20mg — Annie (inactive)".
  const rxLabel = (rx: PrescriptionDetail) => {
    const person = people.find(p => p.id === rx.person_id)?.person_name;
    return `${rx.medication.medication_name}${rx.dose ? ` ${rx.dose}` : ''}${person ? ` — ${person}` : ''}${rx.is_active ? '' : ' (inactive)'}`;
  };
  // Adding offers active prescriptions only; editing also keeps any inactive
  // one a trackable is already linked to, so its row still shows it.
  const linkedRx = new Set(trackables.map(t => t.prescription_id).filter(id => id != null));
  const rxAddOptions  = prescriptions.filter(rx => rx.is_active)
    .map(rx => ({ value: String(rx.id), label: rxLabel(rx) }));
  const rxEditOptions = prescriptions.filter(rx => rx.is_active || linkedRx.has(rx.id))
    .map(rx => ({ value: String(rx.id), label: rxLabel(rx) }));
  const fields: AddField[] = [
    ...TRACKABLE_FIELDS,
    { ...prescriptionField(rxAddOptions),  showInEdit: false },
    { ...prescriptionField(rxEditOptions), showInAdd:  false },
  ];
  const newInCategoryFields: AddField[] = fields.map(f => ({
    ...f,
    showInEdit: false,
    showWhen:   (v: Record<string, string>) => v.trackable_id === NEW && (!f.showWhen || f.showWhen(v)),
  }));
  const editInCategoryFields: AddField[] = fields
    .filter(f => f.showInEdit !== false)
    .map(f => ({ ...f, showInAdd: false }));

  const setActive = async (id: number, active: boolean) => {
    await toggleTrackable(supabase, id, active);
    patchTrackable(id, { is_active: active });
    redraw();
  };

  // ── List 1: not in a category, and every inactive trackable ──────────────

  const looseOrInactive = [...trackables]
    .filter(t => !t.is_active || !links.some(l => l.trackable_id === t.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ── List 2: categories (active trackables only) ───────────────────────────

  const pickOptions = [
    { value: NEW, label: '+ New trackable…' },
    ...trackables
      .filter(t => t.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(t => ({ value: String(t.id), label: `${displayName(t)} — ${TRACK_TYPE_LABEL[t.track_type]}` })),
  ];

  const linkChild = (l: TrackableToCategoryRow): NormalizedChild => {
    const t = byId.get(l.trackable_id)!;
    return { ...toRow(t, l.sort_order), id: l.id, sort_order: l.sort_order, trackable_id: l.trackable_id };
  };

  return (
    <div>
      <ManageableList
        key={`loose-${version}`}
        title="Not in a category"
        description="Trackables that aren't in any category (they don't show on any page until they are), and every inactive trackable. Add new trackables here or in a category below. The type decides how it's entered and charted; ⋯ → Details… for the type, a parent, choice options, questions or a prescription."
        nameColumn="name"
        icons={icons}
        items={looseOrInactive.map(toRow)}
        addFields={fields}
        renderName={(row: Row) => renderTrackable(byId.get(row.id))}
        itemDialog={{
          label: 'Details…',
          title: (row: Row) => row.name,
          render: (row: Row, patch) => detailsDialog(row.id, patch),
        }}
        dal={{
          add: async payload => toRow(await createTrackable(payload), Number.MAX_SAFE_INTEGER),
          update: (id, payload) => editTrackable(id, payload),
          toggle: (id, active) => setActive(id, active),
        }}
      />

      <HierarchicalList
        key={`cats-${version}`}
        title="Categories"
        description="Groups of active trackables, in the order they're entered. A trackable can be in more than one. Place categories on pages in Settings → Layout. Deactivated trackables move to the Inactive list above."
        catPlaceholder="New category… (e.g. Sleep, Morning)"
        categoriesSortable={false}
        removeLabel="Remove from category"
        icons={icons}
        initialCategories={[...categories]
          .sort((a, b) => a.category_name.localeCompare(b.category_name))
          .map(c => ({
            id: c.id, name: c.category_name, is_active: c.is_active, sort_order: 0,
            children: links
              .filter(l => l.category_id === c.id && byId.get(l.trackable_id)?.is_active)
              .map(linkChild),
          }))}
        childFields={[
          {
            key: 'trackable_id', type: 'select', label: 'Trackable', placeholder: 'Add a trackable…',
            required: true, showInEdit: false, options: pickOptions,
          },
          ...newInCategoryFields,
          ...editInCategoryFields,
        ]}
        renderChildName={child => renderTrackable(byId.get(Number(child.trackable_id)))}
        childDialog={{
          label: 'Details…',
          title: child => byId.get(Number(child.trackable_id))?.name ?? '',
          render: (child, patch) => detailsDialog(Number(child.trackable_id), patch),
        }}
        dal={{
          addCategory: async name => {
            const c = await addTrackableCategory(supabase, name);
            setCategories(prev => [...prev, c]);
            return { ...c, sort_order: 0 };
          },
          updateCategory: async (id, name) => {
            await renameTrackableCategory(supabase, id, name);
            setCategories(prev => prev.map(c => c.id === id ? { ...c, category_name: name.trim() } : c));
          },
          toggleCategory: async (id, active) => {
            await toggleTrackableCategory(supabase, id, active);
            setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c));
          },
          reorderCategories: async () => {},   // categories have no order of their own
          addChild: async (categoryId, values, sort) => {
            let trackableId: number;
            if (values.trackable_id === NEW) {
              trackableId = (await createTrackable(values)).id;
            } else {
              trackableId = Number(values.trackable_id);
              if (links.some(l => l.category_id === categoryId && l.trackable_id === trackableId)) {
                addToast(`${byId.get(trackableId)?.name ?? 'It'} is already in this category.`, 'error');
                throw new Error('Already in this category');
              }
            }
            const link = await addTrackableLink(supabase, trackableId, categoryId!, sort);
            setLinks(prev => [...prev, link]);
            redraw();
            return { id: link.id, is_active: true, sort_order: link.sort_order, trackable_id: trackableId };
          },
          updateChild: async (linkId, values) => {
            const id = trackableOfLink(linkId);
            if (id != null) await editTrackable(id, values);
          },
          toggleChild: async (linkId, active) => {
            const id = trackableOfLink(linkId);
            if (id != null) await setActive(id, active);
          },
          removeChild: async linkId => {
            await removeTrackableLink(supabase, linkId);
            setLinks(prev => prev.filter(l => l.id !== linkId));
            redraw();
          },
          reorderChildren: async updates => {
            await reorderTrackableLinks(supabase, updates);
            const order = new Map(updates.map(u => [u.id, u.sort_order]));
            setLinks(prev => prev.map(l => order.has(l.id) ? { ...l, sort_order: order.get(l.id)! } : l));
          },
          moveChild: async (id, categoryId) => {
            if (categoryId == null) return;
            const link = links.find(l => l.id === id);
            if (link && links.some(l => l.category_id === categoryId && l.trackable_id === link.trackable_id)) {
              addToast(`${byId.get(link.trackable_id)?.name ?? 'It'} is already in that category.`, 'error');
              throw new Error('Already in that category');
            }
            await moveTrackableLink(supabase, id, categoryId);
            setLinks(prev => prev.map(l => l.id === id ? { ...l, category_id: categoryId } : l));
          },
        }}
      />
    </div>
  );
}
