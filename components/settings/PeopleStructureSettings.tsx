'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  // Structure containers
  createInfoGroup,  renameInfoGroup,  toggleInfoGroup,  deleteInfoGroup,
  createItemList,   renameItemList,   toggleItemList,   deleteItemList,
  createLogSchema,  renameLogSchema,  toggleLogSchema,  deleteLogSchema,
  createChecklist,  renameChecklist,  toggleChecklist,  deleteChecklist,
  togglePersonStructureLink,
  // Info field types
  getInfoFieldTypes, addInfoFieldType, updateInfoFieldType,
  toggleInfoFieldType, deleteInfoFieldType,
  // Log schema fields
  getLogSchemaFields, getLogSchemaFieldOptions,
  addLogSchemaField, updateLogSchemaField,
  setLogSchemaFieldOptions, toggleLogSchemaField, deleteLogSchemaField,
  // Checklist items — created/deleted on the person's page, not in settings
  createPerson, updatePersonField,
} from '@/lib/dal/people';
import { createClient }  from '@/lib/supabase/client';
import { Button }        from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { InputField }    from '@/components/ui/Display';
import type { PersonRow, PeopleCategoryRow, InfoFieldTypeRow, LogSchemaFieldRow,
              LogSchemaFieldOptionRow } from '@/types/schema';
import { ManageableList } from './ManageableList';

// ── Local row types ───────────────────────────────────────────────────────────

interface InfoGroupRow  { id: number; group_title: string;      is_active: boolean; }
interface ItemListRow   { id: number; list_title: string; list_label: string | null; is_active: boolean; }
interface LogSchemaRow  { id: number; log_title: string;        is_active: boolean; }
interface ChecklistRow  { id: number; checklist_title: string; checklist_label: string | null; is_active: boolean; }
interface LogFieldWithOptions extends LogSchemaFieldRow { options: LogSchemaFieldOptionRow[]; }

interface PersonLinks {
  person: PersonRow; infoGroupIds: number[]; listIds: number[];
  logIds: number[]; checklistIds: number[];
}

interface Props {
  people: PersonRow[]; personLinks: PersonLinks[];
  infoGroups: InfoGroupRow[]; itemLists: ItemListRow[];
  logSchemas: LogSchemaRow[]; checklists: ChecklistRow[];
  peopleCategories: PeopleCategoryRow[];
}

type StructureType = 'info_group' | 'list' | 'log' | 'checklist';

const FIELD_TYPES = ['text', 'date', 'textarea'] as const;
const LOG_FIELD_TYPES = ['text', 'select', 'textarea'] as const;

// ── Shared: editable header row for any structure item ────────────────────────

function StructureItemHeader({
  name, sublabel, is_active,
  hasLabel, labelValue,
  onRename, onToggle, onDelete,
  isExpanded, onToggleExpand,
}: Readonly<{
  name: string; sublabel?: string | null; is_active: boolean;
  hasLabel?: boolean; labelValue?: string | null;
  onRename: (name: string, label?: string | null) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}>) {
  const [editing, setEditing]   = useState(false);
  const [editName, setEditName] = useState(name);
  const [editLabel, setEditLabel] = useState(labelValue ?? '');
  const [saving, setSaving]     = useState(false);

  const save = useCallback(async () => {
    const t = editName.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onRename(t, hasLabel ? (editLabel.trim() || null) : undefined);
      setEditing(false);
    } finally { setSaving(false); }
  }, [editName, editLabel, hasLabel, onRename]);

  return (
    <div className={`manage-item${is_active ? '' : ' manage-item--inactive'}`}>
      {editing ? (
        <>
          <div className="manage-item__edit-block">
            <input className="input--flex" value={editName}
              onChange={e => setEditName(e.target.value)} placeholder="Title…" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
            {hasLabel && (
              <input className="input--flex" value={editLabel}
                onChange={e => setEditLabel(e.target.value)} placeholder="Label (optional)…" />
            )}
          </div>
          <div className="manage-item__actions">
            <Button size="sm" variant="accent" onClick={save} disabled={saving || !editName.trim()}>✓</Button>
            <Button size="sm" variant="ghost"  onClick={() => setEditing(false)}>✕</Button>
          </div>
        </>
      ) : (
        <>
          <span className="manage-item__name">
            {name}
            {sublabel && <span className="manage-item__meta"> · {sublabel}</span>}
          </span>
          <div className="manage-item__actions">
            {onToggleExpand && (
              <Button size="sm" variant="ghost" onClick={onToggleExpand}>
                Fields {isExpanded ? '▲' : '▼'}
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => { setEditName(name); setEditLabel(labelValue ?? ''); setEditing(true); }} title="Rename">✏️</Button>
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

// ── Info Group: expandable with info_field_types ──────────────────────────────

function InfoGroupItem({ group, onRename, onToggle, onDelete }: Readonly<{
  group: InfoGroupRow;
  onRename: (name: string) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}>) {
  const supabase = createClient();
  const router   = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [fields,   setFields]   = useState<InfoFieldTypeRow[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType,  setNewType]  = useState<string>('text');
  const [adding,   setAdding]   = useState(false);

  const load = useCallback(async () => {
    setFields(await getInfoFieldTypes(supabase, group.id));
    setLoaded(true);
  }, [supabase, group.id]);

  const handleExpand = async () => {
    if (!loaded) await load();
    setExpanded(e => !e);
  };

  const addField = async () => {
    if (!newLabel.trim() || adding) return;
    setAdding(true);
    try {
      const f = await addInfoFieldType(supabase, group.id, newLabel, newType, fields.length);
      setFields(prev => [...prev, f]);
      setNewLabel(''); setNewType('text');
    } finally { setAdding(false); }
  };

  return (
    <div>
      <StructureItemHeader
        name={group.group_title} is_active={group.is_active}
        onRename={onRename} onToggle={onToggle} onDelete={onDelete}
        isExpanded={expanded} onToggleExpand={handleExpand}
      />
      {expanded && (
        <div className="structure-sub-panel">
          {fields.length === 0 && !adding && <p className="expand-panel__empty">No fields yet.</p>}
          {fields.map(f => (
            <InfoFieldItem key={f.id} field={f}
              onUpdate={async (label, type) => {
                await updateInfoFieldType(supabase, f.id, label, type);
                setFields(prev => prev.map(x => x.id === f.id ? { ...x, field_label: label, field_type: type } : x));
              }}
              onToggle={async (active) => {
                await toggleInfoFieldType(supabase, f.id, active);
                setFields(prev => prev.map(x => x.id === f.id ? { ...x, is_active: active } : x));
              }}
              onDelete={async () => {
                await deleteInfoFieldType(supabase, f.id);
                setFields(prev => prev.filter(x => x.id !== f.id));
              }}
            />
          ))}
          <div className="structure-sub-panel__add-row">
            <input type="text" className="input--flex" value={newLabel}
              onChange={e => setNewLabel(e.target.value)} placeholder="Field label…"
              onKeyDown={e => e.key === 'Enter' && addField()} />
            <select value={newType} onChange={e => setNewType(e.target.value)} className="input--sm-select">
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button size="sm" variant="accent" onClick={addField} disabled={adding || !newLabel.trim()}>+ Field</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoFieldItem({ field, onUpdate, onToggle, onDelete }: Readonly<{
  field: InfoFieldTypeRow;
  onUpdate: (label: string, type: string) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}>) {
  const [editing,   setEditing]   = useState(false);
  const [editLabel, setEditLabel] = useState(field.field_label);
  const [editType,  setEditType]  = useState(field.field_type);
  const [saving,    setSaving]    = useState(false);

  const save = async () => {
    if (!editLabel.trim()) return;
    setSaving(true);
    try { await onUpdate(editLabel, editType); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div className={`manage-item${field.is_active ? '' : ' manage-item--inactive'}`}>
      {editing ? (
        <>
          <div className="manage-item__edit-block">
            <input className="input--flex" value={editLabel}
              onChange={e => setEditLabel(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
            <select value={editType} onChange={e => setEditType(e.target.value)} className="input--sm-select">
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="manage-item__actions">
            <Button size="sm" variant="accent" onClick={save} disabled={saving || !editLabel.trim()}>✓</Button>
            <Button size="sm" variant="ghost"  onClick={() => setEditing(false)}>✕</Button>
          </div>
        </>
      ) : (
        <>
          <span className="manage-item__name">{field.field_label}</span>
          <span className="field-type-badge">{field.field_type}</span>
          <div className="manage-item__actions">
            <Button size="icon" variant="ghost" onClick={() => { setEditLabel(field.field_label); setEditType(field.field_type); setEditing(true); }} title="Edit">✏️</Button>
            <Button size="sm"   variant="ghost" onClick={() => onToggle(!field.is_active)}>
              {field.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <ConfirmButton onConfirm={onDelete} size="sm">✕</ConfirmButton>
          </div>
        </>
      )}
    </div>
  );
}

// ── Log Schema: expandable with log_schema_fields + options ───────────────────

function LogSchemaItem({ schema, onRename, onToggle, onDelete }: Readonly<{
  schema: LogSchemaRow;
  onRename: (name: string) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}>) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [fields,   setFields]   = useState<LogFieldWithOptions[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKey,   setNewKey]   = useState('');
  const [newType,  setNewType]  = useState('text');
  const [newOpts,  setNewOpts]  = useState('');
  const [adding,   setAdding]   = useState(false);

  const load = useCallback(async () => {
    const raw = await getLogSchemaFields(supabase, schema.id);
    const opts = await getLogSchemaFieldOptions(supabase, raw.map(f => f.id));
    setFields(raw.map(f => ({ ...f, options: opts.filter(o => o.field_id === f.id) })));
    setLoaded(true);
  }, [supabase, schema.id]);

  const handleExpand = async () => {
    if (!loaded) await load();
    setExpanded(e => !e);
  };

  const addField = async () => {
    if (!newLabel.trim() || adding) return;
    setAdding(true);
    try {
      const f = await addLogSchemaField(supabase, schema.id, newLabel, newKey, newType, fields.length);
      let options: LogSchemaFieldOptionRow[] = [];
      if (newType === 'select' && newOpts.trim()) {
        await setLogSchemaFieldOptions(supabase, f.id, newOpts.split(',').map(o => o.trim()).filter(Boolean));
        const opts = await getLogSchemaFieldOptions(supabase, [f.id]);
        options = opts;
      }
      setFields(prev => [...prev, { ...f, options }]);
      setNewLabel(''); setNewKey(''); setNewType('text'); setNewOpts('');
    } finally { setAdding(false); }
  };

  return (
    <div>
      <StructureItemHeader
        name={schema.log_title} is_active={schema.is_active}
        onRename={onRename} onToggle={onToggle} onDelete={onDelete}
        isExpanded={expanded} onToggleExpand={handleExpand}
      />
      {expanded && (
        <div className="structure-sub-panel">
          {fields.length === 0 && <p className="expand-panel__empty">No columns yet.</p>}
          {fields.map(f => (
            <LogFieldItem key={f.id} field={f}
              onUpdate={async (label, key, type, opts) => {
                await updateLogSchemaField(supabase, f.id, label, key, type);
                let options = f.options;
                if (type === 'select') {
                  await setLogSchemaFieldOptions(supabase, f.id, opts ?? []);
                  options = (await getLogSchemaFieldOptions(supabase, [f.id]));
                } else {
                  await setLogSchemaFieldOptions(supabase, f.id, []);
                  options = [];
                }
                setFields(prev => prev.map(x => x.id === f.id ? { ...x, field_label: label, field_key: key, field_type: type, options } : x));
              }}
              onToggle={async (active) => {
                await toggleLogSchemaField(supabase, f.id, active);
                setFields(prev => prev.map(x => x.id === f.id ? { ...x, is_active: active } : x));
              }}
              onDelete={async () => {
                await deleteLogSchemaField(supabase, f.id);
                setFields(prev => prev.filter(x => x.id !== f.id));
              }}
            />
          ))}
          <div className="structure-sub-panel__add-row">
            <input type="text" className="input--flex" value={newLabel}
              onChange={e => setNewLabel(e.target.value)} placeholder="Column label…" />
            <input type="text" className="input--flex" value={newKey}
              onChange={e => setNewKey(e.target.value)} placeholder="Key (auto if blank)…" />
            <select value={newType} onChange={e => setNewType(e.target.value)} className="input--sm-select">
              {LOG_FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {newType === 'select' && (
            <div className="structure-sub-panel__add-row">
              <input type="text" className="input--flex" value={newOpts}
                onChange={e => setNewOpts(e.target.value)} placeholder="Options (comma-separated)…" />
            </div>
          )}
          <div className="structure-sub-panel__add-row">
            <Button size="sm" variant="accent" onClick={addField} disabled={adding || !newLabel.trim()}>+ Column</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogFieldItem({ field, onUpdate, onToggle, onDelete }: Readonly<{
  field: LogFieldWithOptions;
  onUpdate: (label: string, key: string, type: string, opts?: string[]) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}>) {
  const [editing,  setEditing]  = useState(false);
  const [eLabel,   setELabel]   = useState(field.field_label);
  const [eKey,     setEKey]     = useState(field.field_key);
  const [eType,    setEType]    = useState(field.field_type);
  const [eOpts,    setEOpts]    = useState(field.options.map(o => o.option_value).join(', '));
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    if (!eLabel.trim()) return;
    setSaving(true);
    try {
      const opts = eType === 'select' ? eOpts.split(',').map(o => o.trim()).filter(Boolean) : [];
      await onUpdate(eLabel, eKey || eLabel.toLowerCase().replace(/\s+/g, '_'), eType, opts);
      setEditing(false);
    } finally { setSaving(false); }
  };

  return (
    <div className={`manage-item${field.is_active ? '' : ' manage-item--inactive'}`}>
      {editing ? (
        <div className="manage-item__edit-block" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="structure-sub-panel__add-row">
            <input className="input--flex" value={eLabel} onChange={e => setELabel(e.target.value)} placeholder="Label…" autoFocus />
            <input className="input--flex" value={eKey}   onChange={e => setEKey(e.target.value)}   placeholder="Key…" />
            <select value={eType} onChange={e => setEType(e.target.value)} className="input--sm-select">
              {LOG_FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {eType === 'select' && (
            <input className="input--flex" value={eOpts} onChange={e => setEOpts(e.target.value)}
              placeholder="Options (comma-separated)…" style={{ marginTop: 4 }} />
          )}
          <div className="manage-item__actions" style={{ marginTop: 6 }}>
            <Button size="sm" variant="accent" onClick={save} disabled={saving || !eLabel.trim()}>✓ Save</Button>
            <Button size="sm" variant="ghost"  onClick={() => setEditing(false)}>✕ Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <span className="manage-item__name">
            {field.field_label}
            {field.field_key !== field.field_label.toLowerCase().replace(/\s+/g, '_') && (
              <span className="manage-item__meta"> ({field.field_key})</span>
            )}
          </span>
          <span className="field-type-badge">{field.field_type}</span>
          {field.field_type === 'select' && field.options.length > 0 && (
            <span className="manage-item__meta">{field.options.map(o => o.option_value).join(', ')}</span>
          )}
          <div className="manage-item__actions">
            <Button size="icon" variant="ghost" onClick={() => {
              setELabel(field.field_label); setEKey(field.field_key); setEType(field.field_type);
              setEOpts(field.options.map(o => o.option_value).join(', ')); setEditing(true);
            }} title="Edit">✏️</Button>
            <Button size="sm" variant="ghost" onClick={() => onToggle(!field.is_active)}>
              {field.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <ConfirmButton onConfirm={onDelete} size="sm">✕</ConfirmButton>
          </div>
        </>
      )}
    </div>
  );
}

// ── Checklist: container only — items are per-person, managed on each person's page ──

function ChecklistTemplateItem({ checklist, onRename, onToggle, onDelete }: Readonly<{
  checklist: ChecklistRow;
  onRename: (name: string, label?: string | null) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}>) {
  return (
    <StructureItemHeader
      name={checklist.checklist_title} sublabel={checklist.checklist_label}
      is_active={checklist.is_active}
      hasLabel labelValue={checklist.checklist_label}
      onRename={onRename} onToggle={onToggle} onDelete={onDelete}
    />
  );
}

// ── Item list: no sub-items (entries are per-person data, not template config) -

function ItemListItem({ list, onRename, onToggle, onDelete }: Readonly<{
  list: ItemListRow;
  onRename: (name: string, label?: string | null) => Promise<void>;
  onToggle: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}>) {
  return (
    <StructureItemHeader
      name={list.list_title} sublabel={list.list_label}
      is_active={list.is_active}
      hasLabel labelValue={list.list_label}
      onRename={onRename} onToggle={onToggle} onDelete={onDelete}
    />
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

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
      {creating && <div className="settings-section-gap">{createForm}</div>}
    </div>
  );
}

// ── Create forms ──────────────────────────────────────────────────────────────

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
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
      if (data) { onCreated({ id: data.id, list_title: title.trim(), list_label: label.trim() || null, is_active: true }); setTitle(''); setLabel(''); }
    } finally { setSaving(false); }
  }, [supabase, title, label, onCreated]);

  return (
    <div className="form-panel">
      <div className="field-grid">
        <InputField label="List title" id="nl-title">
          <input id="nl-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Milestones" />
        </InputField>
        <InputField label="Label (optional)" id="nl-label">
          <input id="nl-label" type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Short description" />
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
        <input id="log-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. School Behavior Log" />
      </InputField>
      <p className="form-section-label">Columns</p>
      {fields.map((f, i) => (
        <div key={i} className="form-sub-section">
          <div className="form-row">
            <input type="text" value={f.label} onChange={e => setField(i, 'label', e.target.value)}
              placeholder="Column label…" className="input--flex" />
            <select value={f.type} onChange={e => setField(i, 'type', e.target.value)} className="input--sm-select">
              {LOG_FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {fields.length > 1 && (
              <button type="button" onClick={() => setFields(prev => prev.filter((_, fi) => fi !== i))} className="icon-btn">✕</button>
            )}
          </div>
          {f.type === 'select' && (
            <input type="text" value={f.options} onChange={e => setField(i, 'options', e.target.value)}
              placeholder="Options (comma separated)…" />
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
      if (data) { onCreated({ id: data.id, checklist_title: title.trim(), checklist_label: label.trim() || null, is_active: true }); setTitle(''); setLabel(''); }
    } finally { setSaving(false); }
  }, [supabase, title, label, onCreated]);

  return (
    <div className="form-panel">
      <div className="field-grid">
        <InputField label="Checklist title" id="nc-title">
          <input id="nc-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning Routine" />
        </InputField>
        <InputField label="Label (optional)" id="nc-label">
          <input id="nc-label" type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Short description" />
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

function StructureLinkGroup<T extends { id: number; is_active?: boolean }>({ label, items, linkedIds, getName, onToggle }: Readonly<{
  label: string; items: T[]; linkedIds: number[];
  getName: (item: T) => string; onToggle: (id: number) => void;
}>) {
  const active = items.filter(i => (i as { is_active?: boolean }).is_active !== false);
  if (active.length === 0) return null;
  return (
    <>
      <p className="structure-sub-label">{label}</p>
      <div className="link-group">
        {active.map(item => (
          <div key={item.id} className="link-item">
            <span className="link-item__name">{getName(item)}</span>
            <LinkToggle linked={linkedIds.includes(item.id)} onToggle={() => onToggle(item.id)} />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PeopleStructureSettings({
  people: initialPeople, personLinks: initialLinks,
  infoGroups: initGroups, itemLists: initLists,
  logSchemas: initLogs, checklists: initChecklists,
  peopleCategories: initialCategories,
}: Readonly<Props>) {
  const supabase = createClient();
  const router   = useRouter();
  const [links,      setLinks]      = useState<PersonLinks[]>(initialLinks);
  const [infoGroups, setInfoGroups] = useState(initGroups);
  const [itemLists,  setItemLists]  = useState(initLists);
  const [logSchemas, setLogSchemas] = useState(initLogs);
  const [checklists, setChecklists] = useState(initChecklists);
  const [people,     setPeople]     = useState<PersonRow[]>(initialPeople);

  // New-person form state
  const [newName,       setNewName]       = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [addingPerson,  setAddingPerson]  = useState(false);

  const addPerson = useCallback(async () => {
    if (!newName.trim() || !newCategoryId) return;
    setAddingPerson(true);
    try {
      const person = await createPerson(supabase, {
        person_name:  newName.trim(),
        category_id:  Number.parseInt(newCategoryId),
        sort_order:   people.length,
      });
      setPeople(prev => [...prev, person]);
      setLinks(prev => [...prev, { person, infoGroupIds: [], listIds: [], logIds: [], checklistIds: [] }]);
      setNewName(''); setNewCategoryId('');
    } finally { setAddingPerson(false); }
  }, [supabase, newName, newCategoryId, people.length]);

  const toggleLink = useCallback(async (personId: number, structureType: StructureType, structureId: number) => {
    const idsKeyMap: Record<StructureType, keyof PersonLinks> = {
      info_group: 'infoGroupIds', list: 'listIds', log: 'logIds', checklist: 'checklistIds',
    };
    const idsKey     = idsKeyMap[structureType];
    const personLink = links.find(l => l.person.id === personId);
    const currentIds = (personLink?.[idsKey] ?? []) as number[];
    const isLinked   = currentIds.includes(structureId);
    await togglePersonStructureLink(supabase, personId, structureType, structureId, !isLinked);
    setLinks(prev => prev.map(l => l.person.id !== personId ? l : {
      ...l, [idsKey]: isLinked ? currentIds.filter(id => id !== structureId) : [...currentIds, structureId],
    }));
  }, [supabase, links]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">People Structure</span>
      </div>
      <p className="settings-section__desc">
        Create info groups, lists, logs, and checklists, then link them to people.
        Click &quot;Fields&quot; on any item to manage its sub-items.
      </p>

      {/* ── People Categories ───────────────────────────────────────────── */}
      <ManageableList
        title="People Categories"
        description="Categories for grouping people (e.g. Family, Friends)."
        tableName="people_categories"
        nameColumn="category_name"
        items={initialCategories}
        addFields={[
          { key: 'category_name', label: 'Category name', type: 'text', placeholder: 'e.g. Colleagues', required: true },
        ]}
      />

      {/* ── People ─────────────────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">People</span>
          <span className="manage-item__meta">{people.length} active</span>
        </div>
        <p className="settings-section__desc">Add new people here. Their page will be at /people/[name].</p>

        {people.map(person => {
          const cat = initialCategories.find(c => c.id === person.category_id);
          return (
            <div key={person.id} className="manage-item">
              <input
                className="manage-item__name input"
                defaultValue={person.person_name}
                onBlur={async e => {
                  const newName = e.target.value.trim();
                  if (newName && newName !== person.person_name) {
                    await updatePersonField(supabase, person.id, { person_name: newName });
                    setPeople(prev => prev.map(p => p.id === person.id ? { ...p, person_name: newName } : p));
                    router.refresh();
                  }
                }}
              />
              {cat && <span className="badge badge--muted">{cat.category_name}</span>}
            </div>
          );
        })}

        <div className="manage-add-row">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Person name…" className="input--flex"
            onKeyDown={e => e.key === 'Enter' && addPerson()} />
          <select value={newCategoryId} onChange={e => setNewCategoryId(e.target.value)}>
            <option value="">Category…</option>
            {initialCategories.filter(c => c.is_active).map(c => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </select>
          <Button variant="accent" size="sm"
            onClick={addPerson}
            disabled={addingPerson || !newName.trim() || !newCategoryId}>
            {addingPerson ? '…' : '+ Add'}
          </Button>
        </div>
      </div>

      <StructureSection title="Info Groups"
        createForm={<CreateInfoGroupForm onCreated={row => setInfoGroups(prev => [...prev, row])} />}>
        {infoGroups.length === 0 && <p className="empty-state">No info groups yet.</p>}
        {infoGroups.map(g => (
          <InfoGroupItem key={g.id} group={g}
            onRename={async (name) => { await renameInfoGroup(supabase, g.id, name); setInfoGroups(prev => prev.map(x => x.id === g.id ? { ...x, group_title: name } : x)); }}
            onToggle={async (active) => { await toggleInfoGroup(supabase, g.id, active); setInfoGroups(prev => prev.map(x => x.id === g.id ? { ...x, is_active: active } : x)); }}
            onDelete={async () => { await deleteInfoGroup(supabase, g.id); setInfoGroups(prev => prev.filter(x => x.id !== g.id)); }}
          />
        ))}
      </StructureSection>

      <StructureSection title="Lists"
        createForm={<CreateListForm onCreated={row => setItemLists(prev => [...prev, row])} />}>
        {itemLists.length === 0 && <p className="empty-state">No lists yet.</p>}
        {itemLists.map(l => (
          <ItemListItem key={l.id} list={l}
            onRename={async (name, label) => { await renameItemList(supabase, l.id, name, label ?? null); setItemLists(prev => prev.map(x => x.id === l.id ? { ...x, list_title: name, list_label: label ?? null } : x)); }}
            onToggle={async (active) => { await toggleItemList(supabase, l.id, active); setItemLists(prev => prev.map(x => x.id === l.id ? { ...x, is_active: active } : x)); }}
            onDelete={async () => { await deleteItemList(supabase, l.id); setItemLists(prev => prev.filter(x => x.id !== l.id)); }}
          />
        ))}
      </StructureSection>

      <StructureSection title="Logs"
        createForm={<CreateLogForm onCreated={row => setLogSchemas(prev => [...prev, row])} />}>
        {logSchemas.length === 0 && <p className="empty-state">No logs yet.</p>}
        {logSchemas.map(l => (
          <LogSchemaItem key={l.id} schema={l}
            onRename={async (name) => { await renameLogSchema(supabase, l.id, name); setLogSchemas(prev => prev.map(x => x.id === l.id ? { ...x, log_title: name } : x)); }}
            onToggle={async (active) => { await toggleLogSchema(supabase, l.id, active); setLogSchemas(prev => prev.map(x => x.id === l.id ? { ...x, is_active: active } : x)); }}
            onDelete={async () => { await deleteLogSchema(supabase, l.id); setLogSchemas(prev => prev.filter(x => x.id !== l.id)); }}
          />
        ))}
      </StructureSection>

      <StructureSection title="Checklists"
        createForm={<CreateChecklistForm onCreated={row => setChecklists(prev => [...prev, row])} />}>
        {checklists.length === 0 && <p className="empty-state">No checklists yet.</p>}
        {checklists.map(c => (
          <ChecklistTemplateItem key={c.id} checklist={c}
            onRename={async (name, label) => { await renameChecklist(supabase, c.id, name, label ?? null); setChecklists(prev => prev.map(x => x.id === c.id ? { ...x, checklist_title: name, checklist_label: label ?? null } : x)); }}
            onToggle={async (active) => { await toggleChecklist(supabase, c.id, active); setChecklists(prev => prev.map(x => x.id === c.id ? { ...x, is_active: active } : x)); }}
            onDelete={async () => { await deleteChecklist(supabase, c.id); setChecklists(prev => prev.filter(x => x.id !== c.id)); }}
          />
        ))}
      </StructureSection>

      {/* Per-person linking */}
      <div className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">Link to People</span>
        </div>
        <p className="settings-section__desc">Toggle which structures appear on each person's page.</p>
        {people.map(person => {
          const pl = links.find(l => l.person.id === person.id)
            ?? { person, infoGroupIds: [], listIds: [], logIds: [], checklistIds: [] };
          const cat = initialCategories.find(c => c.id === person.category_id);
          return (
            <div key={person.id} className="person-block">
              <h4 className="person-block__name">
                {person.person_name}
                {cat && <span className="badge badge--muted" style={{ marginLeft: 6 }}>{cat.category_name}</span>}
              </h4>
              <StructureLinkGroup label="Info Groups" items={infoGroups} linkedIds={pl.infoGroupIds}
                getName={g => g.group_title} onToggle={id => toggleLink(person.id, 'info_group', id)} />
              <StructureLinkGroup label="Lists" items={itemLists} linkedIds={pl.listIds}
                getName={l => l.list_title}  onToggle={id => toggleLink(person.id, 'list', id)} />
              <StructureLinkGroup label="Logs" items={logSchemas} linkedIds={pl.logIds}
                getName={l => l.log_title}   onToggle={id => toggleLink(person.id, 'log', id)} />
              <StructureLinkGroup label="Checklists" items={checklists} linkedIds={pl.checklistIds}
                getName={c => c.checklist_title} onToggle={id => toggleLink(person.id, 'checklist', id)} />
              {infoGroups.length === 0 && itemLists.length === 0 && logSchemas.length === 0 && checklists.length === 0 && (
                <p className="empty-state">Create some structures above to link them here.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
