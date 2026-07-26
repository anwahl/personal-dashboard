'use client';

import { useState, useCallback } from 'react';
import {
  createInfoGroup, createItemList, createLogSchema, createChecklist,
  togglePersonStructureLink,
} from '@/lib/dal/people';
import { createClient } from '@/lib/supabase/client';
import { Button }       from '@/components/ui/Button';
import { InputField }   from '@/components/ui/Display';
import type { PersonRow } from '@/types/schema';

interface InfoGroupRow { id: number; group_title: string; is_active: boolean; }
interface ItemListRow  { id: number; list_title: string; list_label: string | null; is_active: boolean; }
interface LogSchemaRow { id: number; log_title: string; is_active: boolean; }
interface ChecklistRow { id: number; checklist_title: string; checklist_label: string | null; is_active: boolean; }

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

// ── Link/unlink toggle ────────────────────────────────────────────────────────

function LinkToggle({ linked, onToggle }: Readonly<{ linked: boolean; onToggle: () => void }>) {
  return (
    <Button size="sm" variant={linked ? 'accent' : 'ghost'} onClick={onToggle}>
      {linked ? '✓ Linked' : 'Link'}
    </Button>
  );
}

// ── Generic structure link group (label + chip-group of name+button pairs) ───

function StructureLinkGroup<T extends { id: number }>({
  label,
  items,
  linkedIds,
  getName,
  onToggle,
}: Readonly<{
  label:     string;
  items:     T[];
  linkedIds: number[];
  getName:   (item: T) => string;
  onToggle:  (id: number) => void;
}>) {
  if (items.length === 0) return null;
  return (
    <>
      <p className="structure-sub-label">{label}</p>
      <div className="link-group">
        {items.map(item => (
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

// ── Per-person linking section ────────────────────────────────────────────────

function PersonStructureLinks({
  person, links, infoGroups, itemLists, logSchemas, checklists, onToggle,
}: Readonly<{
  person:     PersonRow;
  links:      PersonLinks;
  infoGroups: InfoGroupRow[];
  itemLists:  ItemListRow[];
  logSchemas: LogSchemaRow[];
  checklists: ChecklistRow[];
  onToggle:   (type: StructureType, id: number) => void;
}>) {
  const hasAny = infoGroups.length > 0 || itemLists.length > 0 ||
                 logSchemas.length > 0  || checklists.length > 0;

  return (
    <div className="person-block">
      <h4 className="person-block__name">{person.person_name}</h4>

      <StructureLinkGroup
        label="Info Groups"
        items={infoGroups}
        linkedIds={links.infoGroupIds}
        getName={g => g.group_title}
        onToggle={id => onToggle('info_group', id)}
      />
      <StructureLinkGroup
        label="Lists"
        items={itemLists}
        linkedIds={links.listIds}
        getName={l => l.list_title}
        onToggle={id => onToggle('list', id)}
      />
      <StructureLinkGroup
        label="Logs"
        items={logSchemas}
        linkedIds={links.logIds}
        getName={l => l.log_title}
        onToggle={id => onToggle('log', id)}
      />
      <StructureLinkGroup
        label="Checklists"
        items={checklists}
        linkedIds={links.checklistIds}
        getName={c => c.checklist_title}
        onToggle={id => onToggle('checklist', id)}
      />

      {!hasAny && (
        <p className="empty-state">Create some structures above to link them here.</p>
      )}
    </div>
  );
}

// ── Create Info Group form ────────────────────────────────────────────────────

interface NewField { label: string; type: string; }

function CreateInfoGroupForm({ onCreated }: Readonly<{ onCreated: (id: number, title: string) => void }>) {
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
      onCreated(group.id, title.trim());
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
            placeholder="Field label…" style={{ flex: 1 }} />
          <select value={f.type} onChange={e => setField(i, 'type', e.target.value)} style={{ width: 110 }}>
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

// ── Create Item List form ─────────────────────────────────────────────────────

function CreateListForm({
  onCreated,
}: Readonly<{
  onCreated: (id: number, title: string) => void;
}>) {
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
        onCreated(data.id, title.trim());
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

// ── Create Log Schema form ────────────────────────────────────────────────────

function CreateLogForm({ onCreated }: Readonly<{ onCreated: (id: number, title: string) => void }>) {
  const supabase = createClient();
  const [title,  setTitle]  = useState('');
  const [fields, setFields] = useState<{ label: string; key: string; type: string; options: string }[]>([
    { label: '', key: '', type: 'text', options: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const addField = () => setFields(prev => [...prev, { label: '', key: '', type: 'text', options: '' }]);
  const setField = (i: number, k: string, v: string) =>
    setFields(prev => prev.map((f, fi) => fi === i ? { ...f, [k]: v } : f));

  const save = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const schema = await createLogSchema(supabase, { log_title: title.trim(), fields });
      onCreated(schema.id, title.trim());
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
          <div className="form-row" style={{ marginBottom: f.type === 'select' ? 6 : 0 }}>
            <input type="text" value={f.label} onChange={e => setField(i, 'label', e.target.value)}
              placeholder="Column label…" style={{ flex: '1 1 120px' }} />
            <select value={f.type} onChange={e => setField(i, 'type', e.target.value)} style={{ width: 110 }}>
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
            <input
              type="text"
              value={f.options}
              onChange={e => setField(i, 'options', e.target.value)}
              placeholder="Options (comma separated): e.g. Good, Okay, Rough"
            />
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

// ── Create Checklist form ─────────────────────────────────────────────────────

function CreateChecklistForm({
  onCreated,
}: Readonly<{
  onCreated: (id: number, title: string) => void;
}>) {
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
        onCreated(data.id, title.trim());
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
  const [creating,   setCreating]   = useState<StructureType | null>(null);

  // ── Link/unlink ────────────────────────────────────────────────────────────

  const toggleLink = useCallback(async (
    personId: number,
    structureType: StructureType,
    structureId: number,
  ) => {
    const idsKeyMap: Record<StructureType, keyof PersonLinks> = {
      info_group: 'infoGroupIds',
      list:       'listIds',
      log:        'logIds',
      checklist:  'checklistIds',
    };
    const idsKey = idsKeyMap[structureType];
    const personLink  = links.find(l => l.person.id === personId);
    const currentIds  = (personLink?.[idsKey] ?? []) as number[];
    const isLinked    = currentIds.includes(structureId);

    await togglePersonStructureLink(supabase, personId, structureType, structureId, !isLinked);

    setLinks(prev => prev.map(l => l.person.id !== personId ? l : {
      ...l,
      [idsKey]: isLinked
        ? currentIds.filter(id => id !== structureId)
        : [...currentIds, structureId],
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

      {/* Create buttons */}
      <div className="structure-create-bar">
        {(['info_group', 'list', 'log', 'checklist'] as StructureType[]).map(t => (
          <Button key={t} size="sm" variant={creating === t ? 'accent' : 'ghost'}
            onClick={() => setCreating(prev => prev === t ? null : t)}>
            + {t === 'info_group' ? 'Info Group' : t === 'list' ? 'List' : t === 'log' ? 'Log' : 'Checklist'}
          </Button>
        ))}
      </div>

      {/* Create forms */}
      {creating === 'info_group' && (
        <CreateInfoGroupForm
          onCreated={(id, title) => {
            setInfoGroups(prev => [...prev, { id, group_title: title, is_active: true }]);
            setCreating(null);
          }}
        />
      )}
      {creating === 'list' && (
        <CreateListForm
          onCreated={(id, title) => {
            setItemLists(prev => [...prev, { id, list_title: title, list_label: null, is_active: true }]);
            setCreating(null);
          }}
        />
      )}
      {creating === 'log' && (
        <CreateLogForm
          onCreated={(id, title) => {
            setLogSchemas(prev => [...prev, { id, log_title: title, is_active: true }]);
            setCreating(null);
          }}
        />
      )}
      {creating === 'checklist' && (
        <CreateChecklistForm
          onCreated={(id, title) => {
            setChecklists(prev => [...prev, { id, checklist_title: title, checklist_label: null, is_active: true }]);
            setCreating(null);
          }}
        />
      )}

      {/* Per-person linking */}
      {people.map(person => {
        const pl = links.find(l => l.person.id === person.id)
          ?? { person, infoGroupIds: [], listIds: [], logIds: [], checklistIds: [] };

        return (
          <PersonStructureLinks
            key={person.id}
            person={person}
            links={pl}
            infoGroups={infoGroups}
            itemLists={itemLists}
            logSchemas={logSchemas}
            checklists={checklists}
            onToggle={(type, id) => toggleLink(person.id, type, id)}
          />
        );
      })}
    </div>
  );
}
