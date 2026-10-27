'use client';

import { TextField, DateField, TextAreaField, SelectField, SaveStatus, SaveState, Card, CardHeader, CardBody, CardSection, CardSectionLabel, Button, EmptyState, Badge, ModeToggle, SubCard, SubCardBody, FieldActions, ChipGroup } from '@/components/ui';
import { useState, useCallback } from 'react';
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
          <div key={d.id} className="list-entry-row">
            <span className="list-entry-text">{d.diagnosis_name}</span>
            {d.diagnosed_date && <span className="list-entry-date">{formatMediumDate(d.diagnosed_date)}</span>}
            {d.notes && <span className="manage-item__meta">{d.notes}</span>}
          </div>
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
            {d.diagnosed_date && <span className="manage-item__meta">{formatMediumDate(d.diagnosed_date)}</span>}
            {d.notes && <span className="manage-item__meta manage-item__meta--truncate">{d.notes}</span>}
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
      <div className="info-field-grid">
        {group.fields.map(f => (
          <div key={f.id} className="info-field-row">
            <span className="info-field-label">{f.field_label}</span>
            {mode === 'view' ? (
              <span className={`info-field-value${f.value ? '' : ' info-field-value--empty'}`}>
                {(f.field_type === 'date' && f.value) ? formatMediumDate(f.value) : (f.value || '—')}
              </span>
            ) : f.field_type === 'textarea' ? (
              <TextAreaField hideLabel label={f.field_label} value={f.value ?? ''}
                onChange={v => onValueChange(f.id, v)} size="short" />
            ) : f.field_type === 'date' ? (
              <DateField hideLabel label={f.field_label} value={f.value ?? ''} onChange={v => onValueChange(f.id, v)} />
            ) : (
              <TextField hideLabel label={f.field_label} value={f.value ?? ''} onChange={v => onValueChange(f.id, v)} />
            )}
          </div>
        ))}
      </div>
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
          <span className="section-label-sub">· {checklist.checklist_label}</span>
        )}
        <span className="section-label-sub">{done.length}/{items.length}</span>
      </CardSectionLabel>

      <div className="checklist-list">
        {undone.map(item => (
          <div key={item.id} className="checklist-item">
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggle(item.id, true)}
              className="checklist-item__checkbox"
            />
            <span className="checklist-item__text">{item.item_text}</span>
            {mode === 'edit' && (
              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}
                title="Remove item">✕</Button>
            )}
          </div>
        ))}

        {done.length > 0 && (
          <details className="checklist-done">
            <summary className="checklist-done__summary">{done.length} completed</summary>
            {done.map(item => (
              <div key={item.id} className="checklist-item checklist-item--done">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggle(item.id, false)}
                  className="checklist-item__checkbox"
                />
                <span className="checklist-item__text checklist-item__text--done">
                  {item.item_text}
                </span>
              </div>
            ))}
          </details>
        )}
      </div>

      {/* Add item always available — immediate save, no edit mode needed */}
      <div className="manage-add-row">
        <TextField hideLabel label="New item" value={newText} onChange={setNewText}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="New item…" className="input--flex" />
        <Button size="sm" variant="secondary" onClick={addItem} busy={adding} disabled={!newText.trim()}>
          Add
        </Button>
      </div>
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
          <span className="section-label-sub">· {list.list_label}</span>
        )}
      </CardSectionLabel>

      <div className="list-entry-list">
        {entries.length === 0 && <EmptyState>No entries yet.</EmptyState>}
        {entries.map(e => (
          <div key={e.id} className="list-entry-row">
            {e.entry_date && (
              <span className="list-entry-date">{formatMediumDate(e.entry_date)}</span>
            )}
            <span className="list-entry-text">{e.entry_text}</span>
            {mode === 'edit' && (
              <Button variant="ghost" size="icon" onClick={() => remove(e.id)}
                title="Remove entry">✕</Button>
            )}
          </div>
        ))}
      </div>

      {mode === 'edit' && (
        <div className="manage-add-row">
          <DateField hideLabel label="Entry date" value={newDate} onChange={setNewDate} className="input--date" />
          <TextField hideLabel label="New entry" value={newText} onChange={setNewText}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="New entry…" className="input--flex" />
          <Button size="sm" variant="secondary" onClick={add} busy={adding} disabled={!newText.trim()}>
            Add
          </Button>
        </div>
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
          <div className="manage-list">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>+ Add Entry</Button>
          </div>
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

// ── Main component ────────────────────────────────────────────────────────────

export function PeoplePageClient({ data, peopleCategories }: Readonly<{ data: PersonPageData; peopleCategories: PeopleCategoryRow[] }>) {
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
      <Card>
        <CardHeader>
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
        </CardHeader>

        <CardBody>
          <DiagnosisSection diagnoses={diagnoses} mode={mode} personId={person.id} />
          <hr />
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
        </CardBody>
      </Card>

      {/* Info groups */}
      {localGroups.length > 0 && (
        <Card>
          <CardBody>
            {localGroups.map((group, gi) => (
              <InfoGroupSection
                key={group.id}
                group={group}
                mode={mode}
                onValueChange={(fieldTypeId, value) => handleFieldChange(gi, fieldTypeId, value)}
              />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Checklists */}
      {checklists.length > 0 && (
        <Card>
          <CardBody>
            {checklists.map(cl => (
              <ChecklistSection key={cl.id} checklist={cl} mode={mode} personId={person.id} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Item lists */}
      {itemLists.length > 0 && (
        <Card>
          <CardBody>
            {itemLists.map(list => (
              <ItemListSection key={list.id} list={list} mode={mode} personId={person.id} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardBody>
            {logs.map(log => (
              <LogSection key={log.id} log={log} mode={mode} personId={person.id} />
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
