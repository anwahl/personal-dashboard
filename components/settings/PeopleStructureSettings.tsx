'use client';

import { useState, useCallback } from 'react';
import {
  createInfoGroup,  renameInfoGroup,  toggleInfoGroup,  deleteInfoGroup,
  createItemList,   renameItemList,   toggleItemList,   deleteItemList,
  createLogSchema,  renameLogSchema,  toggleLogSchema,  deleteLogSchema,
  createChecklist,  renameChecklist,  toggleChecklist,  deleteChecklist,
  togglePersonStructureLink,
} from '@/lib/dal/people';
import { createClient } from '@/lib/supabase/client';
import { Button }       from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { InputField }   from '@/components/ui/Display';
import type { PersonRow } from '@/types/schema';

// ── Local row types (not yet in schema.ts) ────────────────────────────────────

interface InfoGroupRow  { id: number; group_title: string;      is_active: boolean; }
interface ItemListRow   { id: number; list_title: string;  list_label: string | null;      is_active: boolean; }
interface LogSchemaRow  { id: number; log_title: string;        is_active: boolean; }
interface ChecklistRow  { id: number; checklist_title: string; checklist_label: string | null; is_active: boolean; }

interface PersonLinks {
  person:       PersonRow;
  infoGroupIds: number[];
  listIds:      number[];
  logIds:       number[];
  checklistIds: number[];
}

interface Props {
  people:      PersonRow[];
  personLinks: PersonLinks[];
  infoGroups:  InfoGroupRow[];
  itemLists:   ItemListRow[];
  logSchemas:  LogSchemaRow[];
  checklists:  ChecklistRow[];
}

type StructureType = 'info_group' | 'list' | 'log' | 'checklist';

// ── Generic inline-edit item row (no sort — structures aren't ordered) ────────

interface StructureItemProps {
  name:      string;
  sublabel?: string | null;
  is_active: boolean;
  onRename:  (name: string, sublabel?: string | null) => Promise<void>;
  onToggle:  (active: boolean) => Promise<void>;
  onDelete:  () => Promise<void>;
  /** Whether this item has an editable sub-label field (lists & checklists) */
  hasLabel?: boolean;
  labelValue?: string | null;
}

function StructureItem({
  name, sublabel, is_active, hasLabel = false, labelValue = null,
  onRename, onToggle, onDelete,
}: Readonly<StructureItemProps>) {
  const [editing,   setEditing]   = useState(false);
  const [editName,  setEditName]  = useState(name);
  const [editLabel, setEditLabel] = useState(labelValue ?? '');
  const [saving,    setSaving]    = useState(false);

  const startEdit  = () => { setEditName(name); setEditLabel(labelValue ?? ''); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const save = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onRename(trimmed, hasLabel ? (editLabel.trim() || null) : undefined);
      setEditing(false);
    } finally { setSaving(false); }
  }, [editName, editLabel, hasLabel, onRename]);

  return (
    <div className={`manage-item${is_active ? '' : ' manage-item--inactive'}`}>
      {editing ? (
        <>
          <div className="manage-item__edit-block">
            <input
              className="input--flex"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancelEdit(); }}
              placeholder="Title…"
              autoFocus
            />
            {hasLabel && (
              <input
                className="input--flex"
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                placeholder="Label (optional)…"
              />
            )}
          </div>
          <div className="manage-item__actions">
            <Button size="sm" variant="accent" onClick={save} disabled={saving || !editName.trim()}>✓</Button>
            <Button size="sm" variant="ghost"  onClick={cancelEdit}>✕</Button>
          </div>
        </>
      ) : (
        <>
          <span className="manage-item__name">
            {name}
            {sublabel && <span className="manage-item__meta"> · {sublabel}</span>}
          </span>
          <div className="manage-item__actions">
            <Button size="icon" variant="ghost" onClick={startEdit} title="Edit">✏️</Button>
            <Button size="sm"   variant="ghost" onClick={() => onToggle(!is_active)}>
              {is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <ConfirmButton onConfirm={onDelete} size="sm">✕</ConfirmButton>
          </div>
        </>
      )}
    </div>
  );
}

// ── Section wrapper with create form toggle ───────────────────────────────────

function StructureSection({
  title, children, createForm,
}: Readonly<{ title: string; children: React.ReactNode; createForm: React.ReactNode }>) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">{title}</span>
        <Button size="sm" variant={creating ? 'accent' : 'ghost'} onClick={() => setCreating(c => !c)}>
          {creating ? '▲ Hide' : '+ Create'}
        </Button>
      </div>
      <div className="manage-list">{children}</div>
      {creating && (
        <div className="settings-section-gap">
          {/* Clone with onCreate that also closes the form */}
          {createForm}
        </div>
      )}
    </div>
  );
}

// ── Create forms (unchanged from original) ────────────────────────────────────

interface NewField { label: string; type: string; }

function CreateInfoGroupForm({ onCreated }: Readonly<{ onCreated: (row: InfoGroupRow) => void }>) {
  const supabase = createClient();
  const [title,  setTitle]  = useState('');
  const [fields, setFields] = useState<NewField[]>([{ label: '', type: 'text' }]);
  const [saving, setSaving] = useState(false);

  const addField    = () => setFields(prev => [...prev, { label: '', type: 'text' }]);
  const removeField = (i: number) => setFields(prev => prev.filter((_, fi) => fi !== i));
  const setField    = (i: number, key: keyof NewField, val: string) =>
    setFields(prev => prev.map((f, fi) => fi === i ? { ...f, [key]: val } : f));

  const save = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const group = await createInfoGroup(supabase, { group_title: title.trim(), fields });
      onCreated({ id: group.id, group_title: title.trim(), is_active: true });
      setTitle(''); setFields([{ label: '', type: 'text' }]);
    } finally { setSaving(false); }
  }, [supabase, title, fields, onCreated]);

  return (
    <div className="form-panel">
      <InputField label="Group title" id="ig-title">
        <input id="ig-title" type="text" value={title}
          onChange={e => setTitle(e.target.value)} placeholder="e.g. Medical Info" />
      </InputField>
      <p className="form-section-label">Fields</p>
      {fields.map((f, i) => (
        <div key={i} className="form-row form-sub-section">
          <input type="text" value={f.label} onChange={e => setField(i, 'label', e.target.value)}
            placeholder="Field label…" className="input--flex" />
          <select value={f.type} onChange={e => setField(i, 'type', e.target.value)} className="input--sm-select">
            <option value="text">Text</option>
            <option value="date">Date</option>
            <option value="textarea">Textarea</option>
          </select>
          {fields.length > 1 && (
            <button type="button" onClick={() => removeField(i)} className="icon-btn">✕</button>
          )}
        </div>
      ))}
      <div className="form-row form-row--actions">
        <Button size="sm" variant="ghost" onClick={addField}>+ Field</Button>
        <Button size="sm" variant="accent" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create Group'}
        </Button>
      </div>
    </div>
  );
}

function CreateListForm({ onCreated }: Readonly<{ onCreated: (row: ItemListRow) => void }>) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data = await createItemList(supabase, title.trim(), label.trim() || null);
      if (data) {
        onCreated({ id: data.id, list_title: title.trim(), list_label: label.trim() || null, is_active: true });
        setTitle(''); setLabel('');
      }
    } finally { setSaving(false); }
  }, [supabase, title, label, onCreated]);

  return (
    <div className="form-panel">
      <div className="field-grid">
        <InputField label="List title" id="nl-title">
          <input id="nl-title" type="text" value={title}
            onChange={e => setTitle(e.target.value)} placeholder="e.g. Milestones" />
        </InputField>
        <InputField label="Label (optional)" id="nl-label">
          <input id="nl-label" type="text" value={label}
            onChange={e => setLabel(e.target.value)} placeholder="Short description" />
        </InputField>
      </div>
      <div className="form-row form-row--actions">
        <Button size="sm" variant="accent" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create List'}
        </Button>
      </div>
    </div>
  );
}

function CreateLogForm({ onCreated }: Readonly<{ onCreated: (row: LogSchemaRow) => void }>) {
  const supabase = createClient();
  const [title,  setTitle]  = useState('');
  const [fields, setFields] = useState([{ label: '', key: '', type: 'text', options: '' }]);
  const [saving, setSaving] = useState(false);

  const addField = () => setFields(prev => [...prev, { label: '', key: '', type: 'text', options: '' }]);
  const setField = (i: number, k: string, v: string) =>
    setFields(prev => prev.map((f, fi) => fi === i ? { ...f, [k]: v } : f));

  const save = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const schema = await createLogSchema(supabase, { log_title: title.trim(), fields });
      onCreated({ id: schema.id, log_title: title.trim(), is_active: true });
      setTitle(''); setFields([{ label: '', key: '', type: 'text', options: '' }]);
    } finally { setSaving(false); }
  }, [supabase, title, fields, onCreated]);

  return (
    <div className="form-panel">
      <InputField label="Log title" id="log-title">
        <input id="log-title" type="text" value={title}
          onChange={e => setTitle(e.target.value)} placeholder="e.g. School Behavior Log" />
      </InputField>
      <p className="form-section-label">Columns</p>
      {fields.map((f, i) => (
        <div key={i} className="form-sub-section">
          <div className="form-row">
            <input type="text" value={f.label} onChange={e => setField(i, 'label', e.target.value)}
              placeholder="Column label…" className="input--flex" />
            <select value={f.type} onChange={e => setField(i, 'type', e.target.value)} className="input--sm-select">
              <option value="text">Text</option>
              <option value="select">Select</option>
              <option value="textarea">Textarea</option>
            </select>
            {fields.length > 1 && (
              <button type="button" onClick={() => setFields(prev => prev.filter((_, fi) => fi !== i))}
                className="icon-btn">✕</button>
            )}
          </div>
          {f.type === 'select' && (
            <input type="text" value={f.options} onChange={e => setField(i, 'options', e.target.value)}
              placeholder="Options (comma separated): e.g. Good, Okay, Rough" />
          )}
        </div>
      ))}
      <div className="form-row form-row--actions">
        <Button size="sm" variant="ghost" onClick={addField}>+ Column</Button>
        <Button size="sm" variant="accent" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create Log'}
        </Button>
      </div>
    </div>
  );
}

function CreateChecklistForm({ onCreated }: Readonly<{ onCreated: (row: ChecklistRow) => void }>) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data = await createChecklist(supabase, title.trim(), label.trim() || null);
      if (data) {
        onCreated({ id: data.id, checklist_title: title.trim(), checklist_label: label.trim() || null, is_active: true });
        setTitle(''); setLabel('');
      }
    } finally { setSaving(false); }
  }, [supabase, title, label, onCreated]);

  return (
    <div className="form-panel">
      <div className="field-grid">
        <InputField label="Checklist title" id="nc-title">
          <input id="nc-title" type="text" value={title}
            onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning Routine" />
        </InputField>
        <InputField label="Label (optional)" id="nc-label">
          <input id="nc-label" type="text" value={label}
            onChange={e => setLabel(e.target.value)} placeholder="Short description" />
        </InputField>
      </div>
      <div className="form-row form-row--actions">
        <Button size="sm" variant="accent" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create Checklist'}
        </Button>
      </div>
    </div>
  );
}

// ── Per-person linking ────────────────────────────────────────────────────────

function LinkToggle({ linked, onToggle }: Readonly<{ linked: boolean; onToggle: () => void }>) {
  return (
    <Button size="sm" variant={linked ? 'accent' : 'ghost'} onClick={onToggle}>
      {linked ? '✓ Linked' : 'Link'}
    </Button>
  );
}

function StructureLinkGroup<T extends { id: number }>({ label, items, linkedIds, getName, onToggle }: Readonly<{
  label:     string;
  items:     T[];
  linkedIds: number[];
  getName:   (item: T) => string;
  onToggle:  (id: number) => void;
}>) {
  const active = items.filter((i: any) => i.is_active !== false);
  if (active.length === 0) return null;
  return (
    <>
      <p className="structure-sub-label">{label}</p>
      <div className="link-group">
        {active.map(item => (
          <div key={item.id} className="link-item">
            <span className="link-item__name">{getName(item)}</span>
            <LinkToggle
              linked={linkedIds.includes(item.id)}
              onToggle={() => onToggle(item.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PeopleStructureSettings({
  people, personLinks: initialLinks,
  infoGroups: initGroups, itemLists: initLists,
  logSchemas: initLogs, checklists: initChecklists,
}: Readonly<Props>) {
  const supabase = createClient();

  const [links,      setLinks]      = useState<PersonLinks[]>(initialLinks);
  const [infoGroups, setInfoGroups] = useState(initGroups);
  const [itemLists,  setItemLists]  = useState(initLists);
  const [logSchemas, setLogSchemas] = useState(initLogs);
  const [checklists, setChecklists] = useState(initChecklists);

  // ── Link/unlink ─────────────────────────────────────────────────────────────

  const toggleLink = useCallback(async (
    personId: number, structureType: StructureType, structureId: number,
  ) => {
    const idsKeyMap: Record<StructureType, keyof PersonLinks> = {
      info_group: 'infoGroupIds', list: 'listIds', log: 'logIds', checklist: 'checklistIds',
    };
    const idsKey     = idsKeyMap[structureType];
    const personLink = links.find(l => l.person.id === personId);
    const currentIds = (personLink?.[idsKey] ?? []) as number[];
    const isLinked   = currentIds.includes(structureId);
    await togglePersonStructureLink(supabase, personId, structureType, structureId, !isLinked);
    setLinks(prev => prev.map(l => l.person.id !== personId ? l : {
      ...l,
      [idsKey]: isLinked ? currentIds.filter(id => id !== structureId) : [...currentIds, structureId],
    }));
  }, [supabase, links]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">People Structure</span>
      </div>
      <p className="settings-section__desc">
        Create info groups, lists, logs, and checklists, then link them to people.
        They'll appear on that person's page.
      </p>

      {/* ── Info Groups ── */}
      <StructureSection
        title="Info Groups"
        createForm={
          <CreateInfoGroupForm onCreated={row => setInfoGroups(prev => [...prev, row])} />
        }
      >
        {infoGroups.length === 0 && <p className="empty-state">No info groups yet.</p>}
        {infoGroups.map(g => (
          <StructureItem
            key={g.id}
            name={g.group_title}
            is_active={g.is_active}
            onRename={async (name) => {
              await renameInfoGroup(supabase, g.id, name);
              setInfoGroups(prev => prev.map(x => x.id === g.id ? { ...x, group_title: name } : x));
            }}
            onToggle={async (active) => {
              await toggleInfoGroup(supabase, g.id, active);
              setInfoGroups(prev => prev.map(x => x.id === g.id ? { ...x, is_active: active } : x));
            }}
            onDelete={async () => {
              await deleteInfoGroup(supabase, g.id);
              setInfoGroups(prev => prev.filter(x => x.id !== g.id));
            }}
          />
        ))}
      </StructureSection>

      {/* ── Item Lists ── */}
      <StructureSection
        title="Lists"
        createForm={
          <CreateListForm onCreated={row => setItemLists(prev => [...prev, row])} />
        }
      >
        {itemLists.length === 0 && <p className="empty-state">No lists yet.</p>}
        {itemLists.map(l => (
          <StructureItem
            key={l.id}
            name={l.list_title}
            sublabel={l.list_label}
            is_active={l.is_active}
            hasLabel
            labelValue={l.list_label}
            onRename={async (name, label) => {
              await renameItemList(supabase, l.id, name, label ?? null);
              setItemLists(prev => prev.map(x => x.id === l.id ? { ...x, list_title: name, list_label: label ?? null } : x));
            }}
            onToggle={async (active) => {
              await toggleItemList(supabase, l.id, active);
              setItemLists(prev => prev.map(x => x.id === l.id ? { ...x, is_active: active } : x));
            }}
            onDelete={async () => {
              await deleteItemList(supabase, l.id);
              setItemLists(prev => prev.filter(x => x.id !== l.id));
            }}
          />
        ))}
      </StructureSection>

      {/* ── Log Schemas ── */}
      <StructureSection
        title="Logs"
        createForm={
          <CreateLogForm onCreated={row => setLogSchemas(prev => [...prev, row])} />
        }
      >
        {logSchemas.length === 0 && <p className="empty-state">No logs yet.</p>}
        {logSchemas.map(l => (
          <StructureItem
            key={l.id}
            name={l.log_title}
            is_active={l.is_active}
            onRename={async (name) => {
              await renameLogSchema(supabase, l.id, name);
              setLogSchemas(prev => prev.map(x => x.id === l.id ? { ...x, log_title: name } : x));
            }}
            onToggle={async (active) => {
              await toggleLogSchema(supabase, l.id, active);
              setLogSchemas(prev => prev.map(x => x.id === l.id ? { ...x, is_active: active } : x));
            }}
            onDelete={async () => {
              await deleteLogSchema(supabase, l.id);
              setLogSchemas(prev => prev.filter(x => x.id !== l.id));
            }}
          />
        ))}
      </StructureSection>

      {/* ── Checklists ── */}
      <StructureSection
        title="Checklists"
        createForm={
          <CreateChecklistForm onCreated={row => setChecklists(prev => [...prev, row])} />
        }
      >
        {checklists.length === 0 && <p className="empty-state">No checklists yet.</p>}
        {checklists.map(c => (
          <StructureItem
            key={c.id}
            name={c.checklist_title}
            sublabel={c.checklist_label}
            is_active={c.is_active}
            hasLabel
            labelValue={c.checklist_label}
            onRename={async (name, label) => {
              await renameChecklist(supabase, c.id, name, label ?? null);
              setChecklists(prev => prev.map(x => x.id === c.id ? { ...x, checklist_title: name, checklist_label: label ?? null } : x));
            }}
            onToggle={async (active) => {
              await toggleChecklist(supabase, c.id, active);
              setChecklists(prev => prev.map(x => x.id === c.id ? { ...x, is_active: active } : x));
            }}
            onDelete={async () => {
              await deleteChecklist(supabase, c.id);
              setChecklists(prev => prev.filter(x => x.id !== c.id));
            }}
          />
        ))}
      </StructureSection>

      {/* ── Per-person linking ── */}
      <div className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">Link to People</span>
        </div>
        <p className="settings-section__desc">
          Toggle which structures appear on each person's page.
        </p>
        {people.map(person => {
          const pl = links.find(l => l.person.id === person.id)
            ?? { person, infoGroupIds: [], listIds: [], logIds: [], checklistIds: [] };
          const hasAny = infoGroups.length > 0 || itemLists.length > 0 ||
                         logSchemas.length > 0  || checklists.length > 0;
          return (
            <div key={person.id} className="person-block">
              <h4 className="person-block__name">{person.person_name}</h4>
              <StructureLinkGroup label="Info Groups" items={infoGroups} linkedIds={pl.infoGroupIds}
                getName={g => g.group_title} onToggle={id => toggleLink(person.id, 'info_group', id)} />
              <StructureLinkGroup label="Lists" items={itemLists} linkedIds={pl.listIds}
                getName={l => l.list_title}  onToggle={id => toggleLink(person.id, 'list', id)} />
              <StructureLinkGroup label="Logs" items={logSchemas} linkedIds={pl.logIds}
                getName={l => l.log_title}   onToggle={id => toggleLink(person.id, 'log', id)} />
              <StructureLinkGroup label="Checklists" items={checklists} linkedIds={pl.checklistIds}
                getName={c => c.checklist_title} onToggle={id => toggleLink(person.id, 'checklist', id)} />
              {!hasAny && <p className="empty-state">Create some structures above to link them here.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
