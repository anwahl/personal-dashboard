'use client';

import { TextField, DateField, TextAreaField, SelectField, SaveStatus, SaveState, Card, CardHeader, CardBody, CardSection, CardSectionLabel, CardSectionHeader, Button, EmptyState, Badge, ModeToggle, SubCard, SubCardBody, FieldActions, ChipGroup, Checkbox, CardSectionMeta, Field, FieldGrid, ListItem, ExpandPanel, ManageItemMeta, ManageList, ManageAddRow } from '@/components/ui';
import { useState, useCallback, type ReactNode } from 'react';
import { ManageableList, type ManageableListDal } from '@/components/settings/ManageableList';
import type { AddField } from '@/components/settings/FieldInputs';
import { createClient }          from '@/lib/supabase/client';
import { formatMediumDate } from '@/lib/utils/dates';
import { useContextDate } from '@/components/sections/DayContext';
import {
  saveInfoFieldValue, toggleChecklistItemChecked,
  addItemListEntry, deleteItemListEntry,
  addLogEntry, deleteLogEntry,
  createChecklistItem, deleteChecklistItem,
  addDiagnosis, updateDiagnosis, toggleDiagnosis,
  updatePersonField,
}                                from '@/lib/dal/people';
import type {
  PersonPageData, InfoGroupWithFields,
  ItemListWithEntries, LogWithSchemaAndEntries, ChecklistWithItems,
}                                from '@/types/dal';
import type { DiagnosisRow, PeopleCategoryRow } from '@/types/schema';

type Mode = 'view' | 'edit';

// ── Diagnoses ─────────────────────────────────────────────────────────────────

const DIAGNOSIS_FIELDS: AddField[] = [
  { key: 'diagnosis_name', type: 'text',     label: 'Diagnosis', placeholder: 'Diagnosis name…', required: true },
  { key: 'diagnosed_date', type: 'date',     label: 'Date',      required: false },
  { key: 'notes',          type: 'textarea', label: 'Notes',     placeholder: 'Notes…', required: false },
];

/** Diagnoses: a read-only list in view mode; in edit mode, rows edit in
 *  place (⋯ → Edit / Deactivate) with an add row, like Settings. */
function DiagnosisSection({ diagnoses: initial, mode, personId }: Readonly<{
  diagnoses: DiagnosisRow[];
  mode:      Mode;
  personId:  number;
}>) {
  const supabase = createClient();
  // Kept here too, so view mode shows edits made in edit mode.
  const [items, setItems] = useState<DiagnosisRow[]>(initial);
  const str = (v: unknown) => (v == null ? null : String(v));

  const dal: ManageableListDal = {
    add: async (payload, sortOrder) => {
      const d = await addDiagnosis(supabase, personId, String(payload.diagnosis_name),
        str(payload.diagnosed_date), str(payload.notes), sortOrder);
      setItems(prev => [...prev, d]);
      return d as unknown as Awaited<ReturnType<ManageableListDal['add']>>;
    },
    update: async (id, payload) => {
      await updateDiagnosis(supabase, id, String(payload.diagnosis_name),
        str(payload.diagnosed_date), str(payload.notes));
      setItems(prev => prev.map(d => d.id === id ? { ...d, ...payload } as DiagnosisRow : d));
    },
    toggle: async (id, active) => {
      await toggleDiagnosis(supabase, id, active);
      setItems(prev => prev.map(d => d.id === id ? { ...d, is_active: active } : d));
    },
  };

  const active = items.filter(d => d.is_active);

  if (mode === 'view') {
    if (active.length === 0) return null;
    return (
      <CardSection>
        <CardSectionLabel>Diagnoses</CardSectionLabel>
        {active.map(d => (
          <ListItem key={d.id} title={d.diagnosis_name}
            meta={(d.diagnosed_date || d.notes) && <>
              {d.diagnosed_date && <span>{formatMediumDate(d.diagnosed_date)}</span>}
              {d.notes && <span>{d.notes}</span>}
            </>} />
        ))}
      </CardSection>
    );
  }

  return (
    <CardSection>
      <CardSectionLabel>Diagnoses</CardSectionLabel>
      <ManageableList
        bare
        nameColumn="diagnosis_name"
        items={items}
        addFields={DIAGNOSIS_FIELDS}
        dal={dal}
        renderName={(d: DiagnosisRow) => (
          <>
            {d.diagnosis_name}
            {d.diagnosed_date && <ManageItemMeta>{formatMediumDate(d.diagnosed_date)}</ManageItemMeta>}
            {d.notes && <ManageItemMeta truncate>{d.notes}</ManageItemMeta>}
          </>
        )}
      />
    </CardSection>
  );
}

// ── Info groups ───────────────────────────────────────────────────────────────

function InfoGroupSection({ group, mode, onValueChange }: Readonly<{
  group:         InfoGroupWithFields;
  mode:          Mode;
  onValueChange: (fieldTypeId: number, value: string) => void;
}>) {
  return (
    <CardSection>
      <CardSectionLabel>{group.group_title}</CardSectionLabel>
      <FieldGrid>
        {group.fields.map(f =>
          mode === 'view' ? (
            <Field key={f.id} label={f.field_label}
              value={f.value ? (f.field_type === 'date' ? formatMediumDate(f.value) : f.value) : undefined} />
          ) : f.field_type === 'textarea' ? (
            <TextAreaField key={f.id} label={f.field_label} value={f.value ?? ''}
              onChange={v => onValueChange(f.id, v)} size="short" />
          ) : f.field_type === 'date' ? (
            <DateField key={f.id} label={f.field_label} value={f.value ?? ''} onChange={v => onValueChange(f.id, v)} />
          ) : (
            <TextField key={f.id} label={f.field_label} value={f.value ?? ''} onChange={v => onValueChange(f.id, v)} />
          )
        )}
      </FieldGrid>
    </CardSection>
  );
}

// ── Checklists ────────────────────────────────────────────────────────────────

function ChecklistSection({ checklist, mode, personId }: Readonly<{
  checklist: ChecklistWithItems;
  mode:      Mode;
  personId:  number;
}>) {
  const supabase = createClient();
  const [items,   setItems]   = useState(checklist.items);
  const [newText, setNewText] = useState('');
  const [adding,  setAdding]  = useState(false);

  const toggle = useCallback(async (itemId: number, checked: boolean) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_checked: checked } : i));
    await toggleChecklistItemChecked(supabase, itemId, checked);
  }, [supabase, personId]);

  const addItem = useCallback(async () => {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const item = await createChecklistItem(supabase, checklist.id, personId, newText.trim(), items.length);
      setItems(prev => [...prev, item]);
      setNewText('');
    } finally { setAdding(false); }
  }, [supabase, checklist.id, personId, items.length, newText]);

  const removeItem = useCallback(async (itemId: number) => {
    await deleteChecklistItem(supabase, itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, [supabase]);

  const done   = items.filter(i =>  i.is_checked);
  const undone = items.filter(i => !i.is_checked);

  return (
    <CardSection>
      <CardSectionLabel>
        {checklist.checklist_title}
        {checklist.checklist_label && (
          <CardSectionMeta>· {checklist.checklist_label}</CardSectionMeta>
        )}
        <CardSectionMeta>{done.length}/{items.length}</CardSectionMeta>
      </CardSectionLabel>

      <div className="checklist-list">
        {undone.map(item => (
          <div key={item.id} className="checklist-item">
            <Checkbox checked={false} onCheckedChange={() => toggle(item.id, true)}>
              {item.item_text}
            </Checkbox>
            {mode === 'edit' && (
              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}
                title="Remove item">✕</Button>
            )}
          </div>
        ))}

        {done.length > 0 && (
          <ExpandPanel title={`${done.length} completed`}
            hiddenChildren={done.map(item => (
              <div key={item.id} className="checklist-item checklist-item--done">
                <Checkbox checked={true} onCheckedChange={() => toggle(item.id, false)}>
                  <span className="checklist-item__text--done">{item.item_text}</span>
                </Checkbox>
              </div>
            ))} />
        )}
      </div>

      {/* Add item always available — immediate save, no edit mode needed */}
      <ManageAddRow>
        <TextField hideLabel label="New item" value={newText} onChange={setNewText}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="New item…" className="input--flex" />
        <Button size="sm" variant="secondary" onClick={addItem} busy={adding} disabled={!newText.trim()}>
          Add
        </Button>
      </ManageAddRow>
    </CardSection>
  );
}

// ── Item lists ────────────────────────────────────────────────────────────────

function ItemListSection({ list, mode, personId }: Readonly<{
  list:     ItemListWithEntries;
  mode:     Mode;
  personId: number;
}>) {
  const supabase  = createClient();
  const [entries, setEntries] = useState(list.entries);
  const [newText, setNewText] = useState('');
  // New entries are dated today, or a daily page's date when placed on one.
  const today = useContextDate();
  const [newDate, setNewDate] = useState(today);
  const [adding,  setAdding]  = useState(false);

  const add = useCallback(async () => {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const entry = await addItemListEntry(supabase, list.id, newText.trim(), newDate, personId);
      setEntries(prev => [entry, ...prev]);
      setNewText('');
    } finally { setAdding(false); }
  }, [supabase, list.id, newText, newDate, personId]);

  const remove = useCallback(async (id: number) => {
    await deleteItemListEntry(supabase, id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [supabase]);

  return (
    <CardSection>
      <CardSectionLabel>
        {list.list_title}
        {list.list_label && (
          <CardSectionMeta>· {list.list_label}</CardSectionMeta>
        )}
      </CardSectionLabel>

      {entries.length === 0 && <EmptyState>No entries yet.</EmptyState>}
      {entries.map(e => (
        <ListItem key={e.id} title={e.entry_text}
          meta={e.entry_date && <span>{formatMediumDate(e.entry_date)}</span>}
          trailing={mode === 'edit' && (
            <Button variant="ghost" size="icon" onClick={() => remove(e.id)}
              title="Remove entry" aria-label="Remove entry">✕</Button>
          )} />
      ))}

      {mode === 'edit' && (
        <ManageAddRow>
          <DateField hideLabel label="Entry date" value={newDate} onChange={setNewDate} className="input--date" />
          <TextField hideLabel label="New entry" value={newText} onChange={setNewText}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="New entry…" className="input--flex" />
          <Button size="sm" variant="secondary" onClick={add} busy={adding} disabled={!newText.trim()}>
            Add
          </Button>
        </ManageAddRow>
      )}
    </CardSection>
  );
}

// ── Logs ──────────────────────────────────────────────────────────────────────

function LogSection({ log, mode, personId }: Readonly<{
  log:      LogWithSchemaAndEntries;
  mode:     Mode;
  personId: number;
}>) {
  const supabase = createClient();
  const [entries,    setEntries]    = useState(log.entries);
  const [showForm,   setShowForm]   = useState(false);
  const today = useContextDate();
  const [formDate,   setFormDate]   = useState(today);
  const [formValues, setFormValues] = useState<Record<number, string>>(
    Object.fromEntries(log.fields.map(f => [f.id, '']))
  );
  const [adding, setAdding] = useState(false);

  const setVal = (fieldId: number, v: string) =>
    setFormValues(prev => ({ ...prev, [fieldId]: v }));

  const submit = useCallback(async () => {
    setAdding(true);
    try {
      const entry = await addLogEntry(supabase, log.id, formDate, formValues, personId);
      setEntries(prev => [entry, ...prev]);
      setFormValues(Object.fromEntries(log.fields.map(f => [f.id, ''])));
      setShowForm(false);
    } finally { setAdding(false); }
  }, [supabase, log.id, formDate, formValues, personId]);

  const remove = useCallback(async (id: number) => {
    await deleteLogEntry(supabase, id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [supabase]);

  return (
    <CardSection>
      <CardSectionLabel>{log.log_title}</CardSectionLabel>

      {/* Add entry form */}
      {mode === 'edit' && (
        showForm ? (
          <SubCard>
            <SubCardBody>
            <DateField label="Date" value={formDate} onChange={setFormDate} />
            {log.fields.map(f => {
              const props = { label: f.field_label, value: formValues[f.id] ?? '', onChange: (v: string) => setVal(f.id, v) };
              if (f.field_type === 'select') return (
                <SelectField key={f.id} {...props} placeholder="Select…"
                  options={f.options.map(o => ({ value: o.option_value, label: o.option_value }))} />
              );
              if (f.field_type === 'textarea') return <TextAreaField key={f.id} {...props} size="short" />;
              return <TextField key={f.id} {...props} />;
            })}
            <FieldActions alignment="right">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" variant="secondary" onClick={submit} busy={adding}>
                Add Entry
              </Button>
            </FieldActions>
            </SubCardBody>
          </SubCard>
        ) : (
          <ManageList>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>+ Add Entry</Button>
          </ManageList>
        )
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <EmptyState>No entries yet.</EmptyState>
      ) : (
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Date</th>
                {log.fields.map(f => <th key={f.id}>{f.field_label}</th>)}
                {mode === 'edit' && <th />}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{formatMediumDate(e.entry_date)}</td>
                  {log.fields.map(f => (
                    <td key={f.id}>{e.values[f.id] || '—'}</td>
                  ))}
                  {mode === 'edit' && (
                    <td className="log-table__actions">
                      <Button variant="ghost" size="icon" onClick={() => remove(e.id)}
                        title="Delete entry">✕</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardSection>
  );
}

// ── Frames ────────────────────────────────────────────────────────────────────

/** A block of the page: a card, or just its content when bare (inside a LayoutCard). */
function PersonBlock({ bare, header, children }: Readonly<{ bare: boolean; header?: ReactNode; children: ReactNode }>) {
  if (bare) {
    return (
      <>
        {header && <CardSectionHeader>{header}</CardSectionHeader>}
        {children}
      </>
    );
  }
  return (
    <Card>
      {header && <CardHeader>{header}</CardHeader>}
      <CardBody>{children}</CardBody>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PeoplePageClient({ data, peopleCategories, bare = false }: Readonly<{
  data:             PersonPageData;
  peopleCategories: PeopleCategoryRow[];
  /** No cards of its own (inside a LayoutCard). */
  bare?:            boolean;
}>) {
  const { person, diagnoses, infoGroups, itemLists, logs, checklists, prescriptions } = data;
  const supabase = createClient();

  const [mode,       setMode]      = useState<Mode>('view');
  const [categoryId, setCategoryId] = useState<number | null>(person.category_id ?? null);

  const saveCategory = async (newId: number | null) => {
    setCategoryId(newId);
    await updatePersonField(supabase, person.id, { category_id: newId });
  };
  const [saveState,  setSaveState] = useState<SaveState>('idle');
  const [localGroups, setLocalGroups] = useState<InfoGroupWithFields[]>(infoGroups);

  const updateFieldInGroup = (f: typeof infoGroups[0]['fields'][0], fieldTypeId: number, value: string) => 
    f.id === fieldTypeId ? { ...f, value } : f;

  const updateGroupFields = (g: InfoGroupWithFields, gi: number, groupIdx: number, fieldTypeId: number, value: string) =>
    gi !== groupIdx ? g : { ...g, fields: g.fields.map(f => updateFieldInGroup(f, fieldTypeId, value)) };

  const handleFieldChange = (groupIdx: number, fieldTypeId: number, value: string) => {
    setLocalGroups(prev => prev.map((g, gi) => updateGroupFields(g, gi, groupIdx, fieldTypeId, value)));
  };

  const saveInfoGroups = useCallback(async () => {
    setSaveState('saving');
    try {
      const saves: Promise<void>[] = [];
      for (const group of localGroups) {
        for (const field of group.fields) {
          if (field.value !== null) {
            saves.push(saveInfoFieldValue(supabase, field.id, field.value, field.value_id, person.id));
          }
        }
      }
      await Promise.all(saves);
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [supabase, localGroups, person.id]);

  const hasInfoGroups = localGroups.length > 0;
  const hasSections   = hasInfoGroups || checklists.length > 0 || itemLists.length > 0 || logs.length > 0;

  return (
    <div>
      {/* Header */}
      <PersonBlock bare={bare} header={<>
          <div>
            <h2 className="person-header__name">{person.person_name}</h2>
            {mode === 'view' && categoryId && (() => {
              const cat = peopleCategories.find(c => c.id === categoryId);
              return cat ? <Badge variant="muted">{cat.category_name}</Badge> : null;
            })()}
            {mode === 'edit' && (
              <SelectField hideLabel label="Category" value={categoryId ?? ''}
                onChange={v => saveCategory(v ? Number.parseInt(v) : null)}
                placeholder="No category"
                options={peopleCategories.filter(c => c.is_active).map(c => ({ value: c.id, label: c.category_name }))} />
            )}
            {person.birth_date && (
              <p className="person-header__sub">🎂 {formatMediumDate(person.birth_date)}</p>
            )}
          </div>
          <div className="person-header__actions">
            {mode === 'edit' && hasInfoGroups && (
              <>
                <SaveStatus state={saveState} />
                <Button variant="secondary" size="sm" onClick={saveInfoGroups}
                  busy={saveState === 'saving'}>💾 Save</Button>
              </>
            )}
            <ModeToggle editing={mode === 'edit'} onChange={e => setMode(e ? 'edit' : 'view')} />
          </div>
        </>}>
          <DiagnosisSection diagnoses={diagnoses} mode={mode} personId={person.id} />
          {prescriptions.length > 0 && (
            <CardSection>
              <CardSectionLabel>Active Prescriptions</CardSectionLabel>
              <ChipGroup>
                {prescriptions.map(rx => (
                  <Badge key={rx.id}>
                    {rx.alias ?? rx.medication.medication_name}
                    {rx.dose ? ` · ${rx.dose}` : ''}
                  </Badge>
                ))}
              </ChipGroup>
            </CardSection>
          )}

          {!hasSections && diagnoses.length === 0 && prescriptions.length === 0 && (
            <EmptyState>
              No data yet. Add info groups, lists, logs, or checklists in Settings to structure this page.
            </EmptyState>
          )}
      </PersonBlock>

      {/* Info groups */}
      {localGroups.length > 0 && (
        <PersonBlock bare={bare}>
            {localGroups.map((group, gi) => (
              <InfoGroupSection
                key={group.id}
                group={group}
                mode={mode}
                onValueChange={(fieldTypeId, value) => handleFieldChange(gi, fieldTypeId, value)}
              />
            ))}
        </PersonBlock>
      )}

      {/* Checklists */}
      {checklists.length > 0 && (
        <PersonBlock bare={bare}>
            {checklists.map(cl => (
              <ChecklistSection key={cl.id} checklist={cl} mode={mode} personId={person.id} />
            ))}
        </PersonBlock>
      )}

      {/* Item lists */}
      {itemLists.length > 0 && (
        <PersonBlock bare={bare}>
            {itemLists.map(list => (
              <ItemListSection key={list.id} list={list} mode={mode} personId={person.id} />
            ))}
        </PersonBlock>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <PersonBlock bare={bare}>
            {logs.map(log => (
              <LogSection key={log.id} log={log} mode={mode} personId={person.id} />
            ))}
        </PersonBlock>
      )}
    </div>
  );
}
