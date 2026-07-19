'use client';

import { useState, useCallback } from 'react';
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

function LinkToggle({ linked, onToggle }: { linked: boolean; onToggle: () => void }) {
  return (
    <Button size="sm" variant={linked ? 'accent' : 'ghost'} onClick={onToggle}>
      {linked ? '✓ Linked' : 'Link'}
    </Button>
  );
}

// ── Create Info Group form ────────────────────────────────────────────────────

interface NewField { label: string; type: string; }

function CreateInfoGroupForm({ onCreated }: { onCreated: (id: number, title: string) => void }) {
  const supabase = createClient();
  const [title,  setTitle]  = useState('');
  const [fields, setFields] = useState<NewField[]>([{ label: '', type: 'text' }]);
  const [saving, setSaving] = useState(false);

  const addField = () => setFields(prev => [...prev, { label: '', type: 'text' }]);
  const setField = (i: number, key: keyof NewField, val: string) =>
    setFields(prev => prev.map((f, fi) => fi === i ? { ...f, [key]: val } : f));
  const removeField = (i: number) => setFields(prev => prev.filter((_, fi) => fi !== i));

  const save = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { data: group } = await supabase.from('info_groups')
        .insert({ group_title: title.trim() }).select('id').single();
      if (!group) return;

      const validFields = fields.filter(f => f.label.trim());
      if (validFields.length > 0) {
        await supabase.from('info_field_types').insert(
          validFields.map((f, i) => ({
            group_id: group.id, field_label: f.label.trim(),
            field_type: f.type, sort_order: i,
          }))
        );
      }
      onCreated(group.id, title.trim());
      setTitle(''); setFields([{ label: '', type: 'text' }]);
    } finally { setSaving(false); }
  }, [supabase, title, fields, onCreated]);

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
      <InputField label="Group title" id="ig-title">
        <input id="ig-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Medical Info" />
      </InputField>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', margin: '8px 0 6px' }}>Fields</p>
      {fields.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input type="text" value={f.label} onChange={e => setField(i, 'label', e.target.value)}
            placeholder="Field label…" style={{ flex: 1 }} />
          <select value={f.type} onChange={e => setField(i, 'type', e.target.value)} style={{ width: 110 }}>
            <option value="text">Text</option>
            <option value="date">Date</option>
            <option value="textarea">Textarea</option>
          </select>
          {fields.length > 1 && (
            <button type="button" onClick={() => removeField(i)}
              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <Button size="sm" variant="ghost" onClick={addField}>+ Field</Button>
        <Button size="sm" variant="accent" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create Group'}
        </Button>
      </div>
    </div>
  );
}

// ── Create Log Schema form ────────────────────────────────────────────────────

function CreateLogForm({ onCreated }: { onCreated: (id: number, title: string) => void }) {
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
      const { data: schema } = await supabase.from('log_schemas')
        .insert({ log_title: title.trim() }).select('id').single();
      if (!schema) return;

      const validFields = fields.filter(f => f.label.trim());
      if (validFields.length > 0) {
        const { data: createdFields } = await supabase.from('log_schema_fields').insert(
          validFields.map((f, i) => ({
            log_id:      schema.id,
            field_label: f.label.trim(),
            field_key:   f.key.trim() || f.label.trim().toLowerCase().replace(/\s+/g, '_'),
            field_type:  f.type,
            sort_order:  i,
          }))
        ).select('id, field_type');

        // Add options for select fields
        if (createdFields) {
          for (let i = 0; i < validFields.length; i++) {
            const field = validFields[i];
            const created = createdFields[i];
            if (created && field.type === 'select' && field.options.trim()) {
              const opts = field.options.split(',').map((o: string) => o.trim()).filter(Boolean);
              if (opts.length > 0) {
                await supabase.from('log_schema_field_options').insert(
                  opts.map((opt: string, oi: number) => ({
                    field_id:     created.id,
                    option_value: opt,
                    sort_order:   oi,
                  }))
                );
              }
            }
          }
        }
      }
      onCreated(schema.id, title.trim());
      setTitle(''); setFields([{ label: '', key: '', type: 'text', options: '' }]);
    } finally { setSaving(false); }
  }, [supabase, title, fields, onCreated]);

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
      <InputField label="Log title" id="log-title">
        <input id="log-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. School Behavior Log" />
      </InputField>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', margin: '8px 0 6px' }}>Columns</p>
      {fields.map((f, i) => (
        <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: f.type === 'select' ? 6 : 0, flexWrap: 'wrap' }}>
            <input type="text" value={f.label} onChange={e => setField(i, 'label', e.target.value)}
              placeholder="Column label…" style={{ flex: '1 1 120px' }} />
            <select value={f.type} onChange={e => setField(i, 'type', e.target.value)} style={{ width: 110 }}>
              <option value="text">Text</option>
              <option value="select">Select</option>
              <option value="textarea">Textarea</option>
            </select>
            {fields.length > 1 && (
              <button type="button" onClick={() => setFields(prev => prev.filter((_, fi) => fi !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
            )}
          </div>
          {f.type === 'select' && (
            <input
              type="text"
              value={f.options}
              onChange={e => setField(i, 'options', e.target.value)}
              placeholder="Options (comma separated): e.g. Good, Okay, Rough"
              style={{ width: '100%' }}
            />
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <Button size="sm" variant="ghost" onClick={addField}>+ Column</Button>
        <Button size="sm" variant="accent" onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create Log'}
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
}: Props) {
  const supabase = createClient();

  const [links,      setLinks]      = useState<PersonLinks[]>(initialLinks);
  const [infoGroups, setInfoGroups] = useState(initGroups);
  const [itemLists,  setItemLists]  = useState(initLists);
  const [logSchemas, setLogSchemas] = useState(initLogs);
  const [checklists, setChecklists] = useState(initChecklists);

  const [creating, setCreating] = useState<StructureType | null>(null);

  // ── Simple create forms ────────────────────────────────────────────────────

  const [newListTitle,  setNewListTitle]  = useState('');
  const [newListLabel,  setNewListLabel]  = useState('');
  const [newClTitle,    setNewClTitle]    = useState('');
  const [newClLabel,    setNewClLabel]    = useState('');

  const createList = useCallback(async () => {
    if (!newListTitle.trim()) return;
    const { data } = await supabase.from('item_lists')
      .insert({ list_title: newListTitle.trim(), list_label: newListLabel.trim() || null, sort_order: itemLists.length })
      .select('id, list_title, list_label, is_active').single();
    if (data) { setItemLists(prev => [...prev, data as ItemListRow]); setNewListTitle(''); setNewListLabel(''); setCreating(null); }
  }, [supabase, newListTitle, newListLabel, itemLists.length]);

  const createChecklist = useCallback(async () => {
    if (!newClTitle.trim()) return;
    const { data } = await supabase.from('checklists')
      .insert({ checklist_title: newClTitle.trim(), checklist_label: newClLabel.trim() || null, sort_order: checklists.length })
      .select('id, checklist_title, checklist_label, is_active').single();
    if (data) { setChecklists(prev => [...prev, data as ChecklistRow]); setNewClTitle(''); setNewClLabel(''); setCreating(null); }
  }, [supabase, newClTitle, newClLabel, checklists.length]);

  // ── Link/unlink ────────────────────────────────────────────────────────────

  const toggleLink = useCallback(async (
    personId: number,
    structureType: StructureType,
    structureId: number
  ) => {
    const tableMap: Record<StructureType, { junction: string; idCol: string; idsKey: keyof PersonLinks }> = {
      info_group: { junction: 'person_info_group_links', idCol: 'info_group_id', idsKey: 'infoGroupIds' },
      list:       { junction: 'person_item_list_links',  idCol: 'list_id',       idsKey: 'listIds'      },
      log:        { junction: 'person_log_links',         idCol: 'log_id',        idsKey: 'logIds'       },
      checklist:  { junction: 'person_checklist_links',  idCol: 'checklist_id',  idsKey: 'checklistIds' },
    };

    const { junction, idCol, idsKey } = tableMap[structureType];
    const personLink = links.find(l => l.person.id === personId);
    const currentIds = (personLink?.[idsKey] ?? []) as number[];
    const isLinked = currentIds.includes(structureId);

    if (isLinked) {
      await supabase.from(junction).delete().eq('person_id', personId).eq(idCol, structureId);
    } else {
      await supabase.from(junction).insert({ person_id: personId, [idCol]: structureId });
    }

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
        Create info groups, lists, logs, and checklists, then link them to people. They'll appear on that person's page.
      </p>

      {/* Create buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
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
          onCreated={(id, title) => { setInfoGroups(prev => [...prev, { id, group_title: title, is_active: true }]); setCreating(null); }}
        />
      )}
      {creating === 'list' && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
          <div className="field-grid">
            <InputField label="List title" id="nl-title">
              <input id="nl-title" type="text" value={newListTitle} onChange={e => setNewListTitle(e.target.value)} placeholder="e.g. Milestones" />
            </InputField>
            <InputField label="Label (optional)" id="nl-label">
              <input id="nl-label" type="text" value={newListLabel} onChange={e => setNewListLabel(e.target.value)} placeholder="Short description" />
            </InputField>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="accent" onClick={createList} disabled={!newListTitle.trim()}>Create List</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {creating === 'log' && (
        <CreateLogForm
          onCreated={(id, title) => { setLogSchemas(prev => [...prev, { id, log_title: title, is_active: true }]); setCreating(null); }}
        />
      )}
      {creating === 'checklist' && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10 }}>
          <div className="field-grid">
            <InputField label="Checklist title" id="nc-title">
              <input id="nc-title" type="text" value={newClTitle} onChange={e => setNewClTitle(e.target.value)} placeholder="e.g. Morning Routine" />
            </InputField>
            <InputField label="Label (optional)" id="nc-label">
              <input id="nc-label" type="text" value={newClLabel} onChange={e => setNewClLabel(e.target.value)} placeholder="Short description" />
            </InputField>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="accent" onClick={createChecklist} disabled={!newClTitle.trim()}>Create Checklist</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Per-person linking */}
      {people.map(person => {
        const pl = links.find(l => l.person.id === person.id)
          ?? { person, infoGroupIds: [], listIds: [], logIds: [], checklistIds: [] };

        return (
          <div key={person.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: 'var(--text)' }}>
              {person.person_name}
            </h4>

            {infoGroups.length > 0 && (
              <>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  Info Groups
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {infoGroups.map(g => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{g.group_title}</span>
                      <LinkToggle
                        linked={pl.infoGroupIds.includes(g.id)}
                        onToggle={() => toggleLink(person.id, 'info_group', g.id)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {itemLists.length > 0 && (
              <>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  Lists
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {itemLists.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{l.list_title}</span>
                      <LinkToggle
                        linked={pl.listIds.includes(l.id)}
                        onToggle={() => toggleLink(person.id, 'list', l.id)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {logSchemas.length > 0 && (
              <>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  Logs
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {logSchemas.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{l.log_title}</span>
                      <LinkToggle
                        linked={pl.logIds.includes(l.id)}
                        onToggle={() => toggleLink(person.id, 'log', l.id)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {checklists.length > 0 && (
              <>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  Checklists
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {checklists.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{c.checklist_title}</span>
                      <LinkToggle
                        linked={pl.checklistIds.includes(c.id)}
                        onToggle={() => toggleLink(person.id, 'checklist', c.id)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {infoGroups.length === 0 && itemLists.length === 0 && logSchemas.length === 0 && checklists.length === 0 && (
              <p className="empty-state">Create some structures above to link them here.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
