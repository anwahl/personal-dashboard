'use client';

import { InputField, SaveStatus, SaveState } from '@/components/ui/Display';
import { useState, useCallback } from 'react';
import { createClient }          from '@/lib/supabase/client';
import { formatMediumDate, localTodayISO } from '@/lib/utils/dates';
import {
  saveInfoFieldValue, toggleChecklistItemChecked,
  addItemListEntry, deleteItemListEntry,
  addLogEntry, deleteLogEntry,
  createChecklistItem, deleteChecklistItem,
  addDiagnosis, updateDiagnosis, toggleDiagnosis, deleteDiagnosis,
  updatePersonField,
}                                from '@/lib/dal/people';
import { Card, CardHeader, CardBody, CardSection, CardSectionLabel } from '@/components/ui/Card';
import { Button }                from '@/components/ui/Button';
import { ConfirmButton }          from '@/components/ui/ConfirmButton';
import type {
  PersonPageData, InfoGroupWithFields,
  ItemListWithEntries, LogWithSchemaAndEntries, ChecklistWithItems,
}                                from '@/types/dal';
import type { DiagnosisRow, PeopleCategoryRow } from '@/types/schema';

type Mode = 'view' | 'edit';

// ── Diagnoses ─────────────────────────────────────────────────────────────────

function DiagnosisSection({ diagnoses: initial, mode, personId }: Readonly<{
  diagnoses: DiagnosisRow[];
  mode:      Mode;
  personId:  number;
}>) {
  const supabase = createClient();
  const [items,    setItems]    = useState<DiagnosisRow[]>(initial);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes,setEditNotes]= useState('');
  const [newName,  setNewName]  = useState('');
  const [newDate,  setNewDate]  = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding,   setAdding]   = useState(false);

  const startEdit = (d: DiagnosisRow) => {
    setEditId(d.id); setEditName(d.diagnosis_name);
    setEditDate(d.diagnosed_date ?? ''); setEditNotes(d.notes ?? '');
  };

  const saveEdit = useCallback(async () => {
    if (!editId || !editName.trim()) return;
    await updateDiagnosis(supabase, editId, editName, editDate || null, editNotes || null);
    setItems(prev => prev.map(d => d.id === editId
      ? { ...d, diagnosis_name: editName, diagnosed_date: editDate || null, notes: editNotes || null } : d));
    setEditId(null);
  }, [supabase, editId, editName, editDate, editNotes]);

  const addItem = useCallback(async () => {
    if (!newName.trim() || adding) return;
    setAdding(true);
    try {
      const d = await addDiagnosis(supabase, personId, newName, newDate || null, newNotes || null, items.length);
      setItems(prev => [...prev, d]);
      setNewName(''); setNewDate(''); setNewNotes('');
    } finally { setAdding(false); }
  }, [supabase, personId, newName, newDate, newNotes, items.length, adding]);

  const active   = items.filter(d =>  d.is_active);
  const inactive = items.filter(d => !d.is_active);

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
      {active.map(d => (
        <div key={d.id}>
          {editId === d.id ? (
            <div className="manage-item">
              <div className="manage-item__edit-block">
                <input className="input--flex" value={editName} onChange={e => setEditName(e.target.value)}
                  placeholder="Diagnosis name…" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }} />
                <input type="date" className="input--date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                <input className="input--flex" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes…" />
              </div>
              <div className="manage-item__actions">
                <Button size="sm" variant="accent" onClick={saveEdit} disabled={!editName.trim()}>✓</Button>
                <Button size="sm" variant="ghost"  onClick={() => setEditId(null)}>✕</Button>
              </div>
            </div>
          ) : (
            <div className="manage-item">
              <span className="manage-item__name">
                {d.diagnosis_name}
                {d.diagnosed_date && <span className="manage-item__meta"> · {formatMediumDate(d.diagnosed_date)}</span>}
                {d.notes && <span className="manage-item__meta"> · {d.notes}</span>}
              </span>
              <div className="manage-item__actions">
                <Button size="icon" variant="ghost" onClick={() => startEdit(d)} title="Edit">✏️</Button>
                <Button size="sm"   variant="ghost" onClick={async () => { await toggleDiagnosis(supabase, d.id, false); setItems(prev => prev.map(x => x.id === d.id ? { ...x, is_active: false } : x)); }}>Deactivate</Button>
                <ConfirmButton onConfirm={async () => { await deleteDiagnosis(supabase, d.id); setItems(prev => prev.filter(x => x.id !== d.id)); }} size="sm">✕</ConfirmButton>
              </div>
            </div>
          )}
        </div>
      ))}
      {inactive.length > 0 && (
        <details className="manage-inactive">
          <summary className="manage-inactive__summary">{inactive.length} inactive</summary>
          <div className="manage-inactive__body">
            {inactive.map(d => (
              <div key={d.id} className="manage-item manage-item--inactive">
                <span className="manage-item__name">{d.diagnosis_name}</span>
                <div className="manage-item__actions">
                  <Button size="sm" variant="ghost" onClick={async () => { await toggleDiagnosis(supabase, d.id, true); setItems(prev => prev.map(x => x.id === d.id ? { ...x, is_active: true } : x)); }}>Activate</Button>
                  <ConfirmButton onConfirm={async () => { await deleteDiagnosis(supabase, d.id); setItems(prev => prev.filter(x => x.id !== d.id)); }} size="sm">✕</ConfirmButton>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
      <div className="manage-add-row">
        <input className="input--flex" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="Diagnosis name…" onKeyDown={e => e.key === 'Enter' && addItem()} />
        <input type="date" className="input--date" value={newDate} onChange={e => setNewDate(e.target.value)} />
        <input className="input--flex" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Notes…" />
        <Button size="sm" variant="accent" onClick={addItem} disabled={adding || !newName.trim()}>+ Add</Button>
      </div>
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
                {f.value || '—'}
              </span>
            ) : f.field_type === 'textarea' ? (
              <textarea
                value={f.value ?? ''}
                onChange={e => onValueChange(f.id, e.target.value)}
                className="textarea--short"
              />
            ) : (
              <input
                type={f.field_type === 'date' ? 'date' : 'text'}
                value={f.value ?? ''}
                onChange={e => onValueChange(f.id, e.target.value)}
              />
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
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="New item…"
          className="input--flex"
        />
        <Button size="sm" variant="accent" onClick={addItem} disabled={adding || !newText.trim()}>
          {adding ? '…' : 'Add'}
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
  const [newDate, setNewDate] = useState(localTodayISO());
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
        {entries.length === 0 && <p className="empty-state">No entries yet.</p>}
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
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            className="input--date" />
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="New entry…"
            className="input--flex"
          />
          <Button size="sm" variant="accent" onClick={add} disabled={adding || !newText.trim()}>
            {adding ? '…' : 'Add'}
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
  const [formDate,   setFormDate]   = useState(localTodayISO());
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
          <div className="form-panel">
            <InputField label="Date" id={`log-date-${log.id}`}>
              <input id={`log-date-${log.id}`} type="date" value={formDate}
                onChange={e => setFormDate(e.target.value)} />
            </InputField>
            {log.fields.map(f => (
              <InputField key={f.id} label={f.field_label} id={`lf-${f.id}`}>
                {f.field_type === 'select' ? (
                  <select id={`lf-${f.id}`} value={formValues[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)}>
                    <option value="">Select…</option>
                    {f.options.map(o => <option key={o.id} value={o.option_value}>{o.option_value}</option>)}
                  </select>
                ) : f.field_type === 'textarea' ? (
                  <textarea id={`lf-${f.id}`} value={formValues[f.id] ?? ''}
                    onChange={e => setVal(f.id, e.target.value)} className="textarea--short" />
                ) : (
                  <input id={`lf-${f.id}`} type="text" value={formValues[f.id] ?? ''}
                    onChange={e => setVal(f.id, e.target.value)} />
                )}
              </InputField>
            ))}
            <div className="form-row form-row--actions">
              <Button size="sm" variant="accent" onClick={submit} disabled={adding}>
                {adding ? 'Saving…' : 'Add Entry'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="manage-list">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>+ Add Entry</Button>
          </div>
        )
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <p className="empty-state">No entries yet.</p>
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
              return cat ? <span className="badge badge--muted">{cat.category_name}</span> : null;
            })()}
            {mode === 'edit' && (
              <select value={categoryId ?? ''} onChange={e => saveCategory(e.target.value ? Number.parseInt(e.target.value) : null)}>
                <option value="">No category</option>
                {peopleCategories.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.category_name}</option>
                ))}
              </select>
            )}
            {person.birth_date && (
              <p className="person-header__sub">🎂 {formatMediumDate(person.birth_date)}</p>
            )}
          </div>
          <div className="person-header__actions">
            {mode === 'edit' && hasInfoGroups && (
              <>
                <SaveStatus state={saveState} />
                <Button variant="accent" size="sm" onClick={saveInfoGroups}
                  disabled={saveState === 'saving'}>💾 Save</Button>
              </>
            )}
            <Button variant="ghost" size="sm"
              onClick={() => setMode(m => m === 'view' ? 'edit' : 'view')}>
              {mode === 'view' ? '✏️ Edit' : '← View'}
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          <DiagnosisSection diagnoses={diagnoses} mode={mode} personId={person.id} />

          {prescriptions.length > 0 && (
            <CardSection>
              <CardSectionLabel>Active Prescriptions</CardSectionLabel>
              <div className="chip-group">
                {prescriptions.map(rx => (
                  <span key={rx.id} className="badge">
                    {rx.alias ?? rx.medication.medication_name}
                    {rx.dose ? ` · ${rx.dose}` : ''}
                  </span>
                ))}
              </div>
            </CardSection>
          )}

          {!hasSections && diagnoses.length === 0 && prescriptions.length === 0 && (
            <p className="empty-state">
              No data yet. Add info groups, lists, logs, or checklists in Settings to structure this page.
            </p>
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
