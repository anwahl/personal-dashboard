'use client';

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@/lib/supabase/client';
import {
  saveInfoFieldValue, toggleChecklistItemState,
  addItemListEntry, deleteItemListEntry,
  addLogEntry, deleteLogEntry,
}                                from '@/lib/dal/people';
import { Card, CardHeader, CardTitle, CardBody, CardSection, CardSectionLabel } from '@/components/ui/Card';
import { Button }                from '@/components/ui/Button';
import { Markdown }              from '@/components/ui/Markdown';
import { InputField, SaveStatus } from '@/components/ui/Display';
import type { SaveState }        from '@/components/ui/Display';
import type {
  PersonPageData, InfoGroupWithFields, InfoFieldTypeWithValue,
  ItemListWithEntries, LogWithSchemaAndEntries, ChecklistWithItems,
}                                from '@/types/dal';

type Mode = 'view' | 'edit';

function fmtDate(d: string | null) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Info groups ───────────────────────────────────────────────────────────────

function InfoGroupSection({ group, mode, onValueChange }: {
  group:         InfoGroupWithFields;
  mode:          Mode;
  onValueChange: (fieldTypeId: number, value: string) => void;
}) {
  return (
    <CardSection>
      <CardSectionLabel>{group.group_title}</CardSectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {group.fields.map(f => (
          <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, alignItems: 'start' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)', paddingTop: 8 }}>
              {f.field_label}
            </span>
            {mode === 'view' ? (
              <span style={{ fontSize: '0.88rem', color: f.value ? 'var(--text)' : 'var(--text-faint)', padding: '6px 0', fontStyle: f.value ? 'normal' : 'italic' }}>
                {f.value || '—'}
              </span>
            ) : f.field_type === 'textarea' ? (
              <textarea
                value={f.value ?? ''}
                onChange={e => onValueChange(f.id, e.target.value)}
                style={{ minHeight: 60 }}
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

function ChecklistSection({ checklist, mode, personId }: { checklist: ChecklistWithItems; mode: Mode; personId: number }) {
  const supabase = createClient();
  const [items, setItems] = useState(checklist.items);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);

  const toggle = useCallback(async (itemId: number, checked: boolean) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_checked: checked } : i));
    await toggleChecklistItemState(supabase, itemId, personId, checked);
  }, [supabase, personId]);

  const addItem = useCallback(async () => {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const { data } = await supabase
        .from('checklist_items')
        .insert({ checklist_id: checklist.id, item_text: newText.trim(), sort_order: items.length })
        .select().single();
      if (data) { setItems(prev => [...prev, data as typeof items[0]]); setNewText(''); }
    } finally { setAdding(false); }
  }, [supabase, checklist.id, items.length, newText]);

  const removeItem = useCallback(async (itemId: number) => {
    await supabase.from('checklist_items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, [supabase]);

  const done   = items.filter(i => i.is_checked);
  const undone = items.filter(i => !i.is_checked);

  return (
    <CardSection>
      <CardSectionLabel>
        {checklist.checklist_title}
        {checklist.checklist_label && (
          <span style={{ fontWeight: 400, color: 'var(--text-faint)', marginLeft: 6 }}>
            · {checklist.checklist_label}
          </span>
        )}
        <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-faint)' }}>
          {done.length}/{items.length}
        </span>
      </CardSectionLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {undone.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggle(item.id, true)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.88rem', color: 'var(--text)', flex: 1 }}>{item.item_text}</span>
            {mode === 'edit' && (
              <button type="button" onClick={() => removeItem(item.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px' }}>
                ✕
              </button>
            )}
          </div>
        ))}

        {done.length > 0 && (
          <details style={{ marginTop: 4 }}>
            <summary style={{ fontSize: '0.75rem', color: 'var(--text-faint)', cursor: 'pointer', padding: '2px 0' }}>
              {done.length} completed
            </summary>
            {done.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32, opacity: 0.6 }}>
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggle(item.id, false)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', flex: 1, textDecoration: 'line-through' }}>
                  {item.item_text}
                </span>
              </div>
            ))}
          </details>
        )}
      </div>

      {mode === 'edit' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="New item…"
            style={{ flex: 1 }}
          />
          <Button size="sm" variant="accent" onClick={addItem} disabled={adding || !newText.trim()}>
            {adding ? '…' : 'Add'}
          </Button>
        </div>
      )}
    </CardSection>
  );
}

// ── Item lists ────────────────────────────────────────────────────────────────

function ItemListSection({ list, mode, personId }: { list: ItemListWithEntries; mode: Mode; personId: number }) {
  const supabase   = createClient();
  const [entries, setEntries] = useState(list.entries);
  const [newText,  setNewText]  = useState('');
  const [newDate,  setNewDate]  = useState(localTodayISO());
  const [adding,   setAdding]   = useState(false);

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
          <span style={{ fontWeight: 400, color: 'var(--text-faint)', marginLeft: 6 }}>· {list.list_label}</span>
        )}
      </CardSectionLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.length === 0 && <p className="empty-state">No entries yet.</p>}
        {entries.map(e => (
          <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            {e.entry_date && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', flexShrink: 0, paddingTop: 3, minWidth: 70 }}>
                {fmtDate(e.entry_date)}
              </span>
            )}
            <span style={{ fontSize: '0.88rem', color: 'var(--text)', flex: 1 }}>{e.entry_text}</span>
            {mode === 'edit' && (
              <button type="button" onClick={() => remove(e.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, flexShrink: 0 }}>
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {mode === 'edit' && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ width: 150 }} />
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="New entry…"
              style={{ flex: 1 }}
            />
            <Button size="sm" variant="accent" onClick={add} disabled={adding || !newText.trim()}>
              {adding ? '…' : 'Add'}
            </Button>
          </div>
        </div>
      )}
    </CardSection>
  );
}

// ── Logs ──────────────────────────────────────────────────────────────────────

function LogSection({ log, mode, personId }: { log: LogWithSchemaAndEntries; mode: Mode; personId: number }) {
  const supabase = createClient();
  const [entries, setEntries] = useState(log.entries);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(localTodayISO());
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
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: 10 }}>
            <InputField label="Date" id={`log-date-${log.id}`}>
              <input id={`log-date-${log.id}`} type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </InputField>
            {log.fields.map(f => (
              <InputField key={f.id} label={f.field_label} id={`lf-${f.id}`}>
                {f.field_type === 'select' ? (
                  <select id={`lf-${f.id}`} value={formValues[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)}>
                    <option value="">Select…</option>
                    {f.options.map(o => <option key={o.id} value={o.option_value}>{o.option_value}</option>)}
                  </select>
                ) : f.field_type === 'textarea' ? (
                  <textarea id={`lf-${f.id}`} value={formValues[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)} style={{ minHeight: 60 }} />
                ) : (
                  <input id={`lf-${f.id}`} type="text" value={formValues[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)} />
                )}
              </InputField>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="accent" onClick={submit} disabled={adding}>
                {adding ? 'Saving…' : 'Add Entry'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>+ Add Entry</Button>
          </div>
        )
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <p className="empty-state">No entries yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 8px 4px 0', color: 'var(--text-faint)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  Date
                </th>
                {log.fields.map(f => (
                  <th key={f.id} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-faint)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {f.field_label}
                  </th>
                ))}
                {mode === 'edit' && <th style={{ borderBottom: '1px solid var(--border)' }} />}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px 6px 0', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                    {fmtDate(e.entry_date)}
                  </td>
                  {log.fields.map(f => (
                    <td key={f.id} style={{ padding: '6px 8px', color: 'var(--text-muted)', verticalAlign: 'top' }}>
                      {e.values[f.id] || '—'}
                    </td>
                  ))}
                  {mode === 'edit' && (
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      <button type="button" onClick={() => remove(e.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px' }}>
                        ✕
                      </button>
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

export function PeoplePageClient({ data }: { data: PersonPageData }) {
  const { person, diagnoses, infoGroups, itemLists, logs, checklists, prescriptions } = data;
  const supabase = createClient();

  const [mode,        setMode]       = useState<Mode>('view');
  const [saveState,   setSaveState]  = useState<SaveState>('idle');

  // Local copy of info group field values for batch save
  const [localGroups, setLocalGroups] = useState<InfoGroupWithFields[]>(infoGroups);

  const handleFieldChange = (groupIdx: number, fieldTypeId: number, value: string) => {
    setLocalGroups(prev => prev.map((g, gi) =>
      gi !== groupIdx ? g : {
        ...g,
        fields: g.fields.map(f => f.id === fieldTypeId ? { ...f, value } : f),
      }
    ));
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
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{person.person_name}</h2>
            {person.birth_date && (
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                🎂 {fmtDate(person.birth_date)}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {mode === 'edit' && hasInfoGroups && (
              <>
                <SaveStatus state={saveState} />
                <Button variant="accent" size="sm" onClick={saveInfoGroups} disabled={saveState === 'saving'}>
                  💾 Save
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setMode(m => m === 'view' ? 'edit' : 'view')}>
              {mode === 'view' ? '✏️ Edit' : '← View'}
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          {/* Diagnoses */}
          {diagnoses.length > 0 && (
            <CardSection>
              <CardSectionLabel>Diagnoses</CardSectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {diagnoses.map(d => (
                  <span key={d.id} className="badge badge--accent">{d.diagnosis_name}</span>
                ))}
              </div>
            </CardSection>
          )}

          {/* Active prescriptions */}
          {prescriptions.length > 0 && (
            <CardSection>
              <CardSectionLabel>Active Prescriptions</CardSectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
        <Card style={{ marginTop: 16 }}>
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
        <Card style={{ marginTop: 16 }}>
          <CardBody>
            {checklists.map(cl => (
              <ChecklistSection key={cl.id} checklist={cl} mode={mode} personId={person.id} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Item lists */}
      {itemLists.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <CardBody>
            {itemLists.map(list => (
              <ItemListSection key={list.id} list={list} mode={mode} personId={person.id} />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card style={{ marginTop: 16 }}>
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
