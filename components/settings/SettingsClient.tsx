'use client';

import { Button }           from '@/components/ui/Button';
import { useState, useCallback } from 'react';
import { createClient }          from '@/lib/supabase/client';
import { createProvider, updateProvider, toggleProviderActive } from '@/lib/dal/providers';
import { ManageableList }        from './ManageableList';
import { SymptomSettings }       from './SymptomSettings';
import { JournalSettings }       from './JournalSettings';
import { PeopleStructureSettings } from './PeopleStructureSettings';
import { TrackableSettings }     from './TrackableSettings';
import { ChartSettings }         from './ChartSettings';
import { LastTimeSettings }      from '../last-time/LastTimeSettings';
import type { SymptomCategoryWithTypes, JournalCategoryWithPrompts, ChartDefinitionDetail, ChartCategoryRow } from '@/types/dal';
import type { PersonRow, ProviderTypeRow, DailyTrackableRow } from '@/types/schema';

// Re-export TabBar from ui for convenience
function TabBarLocal({ tabs, active, onChange }: Readonly<{
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}>) {
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          className={`tab${active === t.id ? ' tab--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

type TabId = 'daily' | 'tracking' | 'charts' | 'health' | 'journal' | 'providers' | 'people' | 'lasttime';

const TABS: { id: TabId; label: string }[] = [
  { id: 'daily',    label: '📅 Daily'     },
  { id: 'tracking', label: '📊 Tracking'  },
  { id: 'charts',   label: '📈 Charts'    },
  { id: 'lasttime', label: '⏱ Last Time'  },
  { id: 'health',   label: '🩺 Health'    },
  { id: 'journal',  label: '📔 Journal'   },
  { id: 'providers',label: '🏥 Providers' },
  { id: 'people',   label: '👤 People'    },
];

interface Props {
  // Tracking
  trackables:        DailyTrackableRow[];
  chartDefinitions:  ChartDefinitionDetail[];
  chartCategories:   ChartCategoryRow[];
  // Daily
  tags:              any[];
  intentions:        any[];
  // Health
  symptomCategories: SymptomCategoryWithTypes[];
  sleepEventTypes:   any[];
  // Journal
  journalCategories: JournalCategoryWithPrompts[];
  // Providers
  providers:         any[];
  providerTypes:     ProviderTypeRow[];
  // Last Time
  mediaTypes:        any[];
  mediaGenres:       any[];
  mediaStatuses:     any[];
  // People structure
  people:            PersonRow[];
  personLinks:       any[];
  infoGroups:        any[];
  itemLists:         any[];
  logSchemas:        any[];
  checklists:        any[];
}

export function SettingsClient({
  trackables, chartDefinitions, chartCategories,
  tags, intentions,
  symptomCategories, sleepEventTypes,
  journalCategories,
  providers, providerTypes,
  mediaTypes, mediaGenres, mediaStatuses,
  people, personLinks, infoGroups, itemLists, logSchemas, checklists,
}: Readonly<Props>) {
  const [tab, setTab] = useState<TabId>('daily');

  return (
    <div>
      <TabBarLocal tabs={TABS} active={tab} onChange={id => setTab(id as TabId)} />

      <div className="settings-tab-content">

        {/* ── DAILY ─────────────────────────────────────────────────────────────*/}
        <div className={tab === 'daily' ? '' : 'hidden'}>
          <>
            <ManageableList
              title="Tags"
              description="Applied to daily entries. Use kebab-case (e.g. aquatic-rehab)."
              tableName="tags"
              nameColumn="tag_value"
              items={tags}
              addFields={[
                { key: 'tag_value', label: 'Tag', type: 'text', placeholder: 'e.g. aquatic-rehab', required: true },
              ]}
            />

            <ManageableList
              title="Intentions"
              description="One is randomly selected each morning when a new daily entry is created."
              tableName="intentions"
              nameColumn="value"
              items={intentions}
              addFields={[
                { key: 'value', label: 'Intention', type: 'text', placeholder: 'e.g. Rest when needed, push when possible.', required: true },
              ]}
              renderName={item => <em>"{String(item.value)}"</em>}
            />
          </>
</div>

        {/* ── TRACKING ──────────────────────────────────────────────────────────*/}
        <div className={tab === 'tracking' ? '' : 'hidden'}>
          <TrackableSettings trackables={trackables} />
</div>

        {/* ── CHARTS ────────────────────────────────────────────────────────────*/}
        <div className={tab === 'charts' ? '' : 'hidden'}>
          <ChartSettings
            chartDefinitions={chartDefinitions}
            trackables={trackables.filter(t => t.is_active)}
            categories={chartCategories}
          />
</div>

        {/* ── LAST TIME ─────────────────────────────────────────────────────────*/}
        <div className={tab === 'lasttime' ? '' : 'hidden'}>
          <LastTimeSettings
            trackables={trackables.filter(t => t.track_type === 'boolean' && t.is_active)}
            mediaTypes={mediaTypes}
            mediaGenres={mediaGenres}
            mediaStatuses={mediaStatuses}
          />
</div>

        {/* ── HEALTH ────────────────────────────────────────────────────────────*/}
        <div className={tab === 'health' ? '' : 'hidden'}>
          <>
            <SymptomSettings categories={symptomCategories} />

            <ManageableList
              title="Sleep Events"
              description="Boolean sleep events tracked on the health log (hallucinations, restless legs, etc.)."
              tableName="sleep_event_types"
              nameColumn="type_name"
              items={sleepEventTypes}
              addFields={[
                { key: 'type_name', label: 'Event name', type: 'text', placeholder: 'e.g. Night Sweats', required: true },
              ]}
            />
          </>
</div>

        {/* ── JOURNAL ───────────────────────────────────────────────────────────*/}
        <div className={tab === 'journal' ? '' : 'hidden'}>
          <JournalSettings categories={journalCategories} />
</div>

        {/* ── PROVIDERS ─────────────────────────────────────────────────────────*/}
        <div className={tab === 'providers' ? '' : 'hidden'}>
          <ProviderSection providers={providers} providerTypes={providerTypes} />
        </div>

        {/* ── PEOPLE ────────────────────────────────────────────────────────────*/}
        <div className={tab === 'people' ? '' : 'hidden'}>
          <PeopleStructureSettings
            people={people}
            personLinks={personLinks}
            infoGroups={infoGroups}
            itemLists={itemLists}
            logSchemas={logSchemas}
            checklists={checklists}
          />
        </div>
      </div>
    </div>
  );
}

// ── Provider section ─────────────────────────────────────────────────────────

function ProviderSection({ providers: initial, providerTypes }: Readonly<{
  providers:     any[];
  providerTypes: ProviderTypeRow[];
}>) {
  const supabase   = createClient();
  const [providers, setProviders] = useState<any[]>(initial);
  const [editId,    setEditId]    = useState<number | null>(null);
  const [editForm,  setEditForm]  = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);

  const startEdit = (p: any) => {
    setEditId(p.id);
    setEditForm({
      provider_type_id: String(p.provider_type_id ?? ''),
      provider_name:    p.provider_name    ?? '',
      practice_name:    p.practice_name   ?? '',
      phone:            p.phone           ?? '',
    });
  };

  const saveEdit = useCallback(async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const updated = await updateProvider(supabase, editId, {
        provider_type_id: Number.parseInt(editForm.provider_type_id ?? '0'),
        provider_name:    editForm.provider_name?.trim()  || null,
        practice_name:    editForm.practice_name?.trim()  || null,
        phone:            editForm.phone?.trim()           || null,
      });
      setProviders(prev => prev.map(p => p.id === editId ? updated : p));
      setEditId(null);
    } finally { setSaving(false); }
  }, [supabase, editId, editForm]);

  const toggleActive = useCallback(async (id: number, isActive: boolean) => {
    await toggleProviderActive(supabase, id, isActive);
    setProviders(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));
  }, [supabase]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">Providers</span>
      </div>
      <p className="settings-section__desc">
        Healthcare providers linked to appointments and prescriptions.
      </p>

      {providers.map((p: any) => (
        <div key={p.id} className={`manage-item${p.is_active ? '' : ' manage-item--inactive'}`}>
          {editId === p.id ? (
            <>
              <select
                value={editForm.provider_type_id ?? ''}
                onChange={e => setEditForm(f => ({ ...f, provider_type_id: e.target.value }))}
                style={{ width: 130 }}
              >
                {providerTypes.map((t: ProviderTypeRow) => (
                  <option key={t.id} value={t.id}>{t.type_name}</option>
                ))}
              </select>
              <input type="text" value={editForm.provider_name ?? ''}
                onChange={e => setEditForm(f => ({ ...f, provider_name: e.target.value }))}
                placeholder="Provider name" style={{ flex: 1 }} />
              <input type="text" value={editForm.practice_name ?? ''}
                onChange={e => setEditForm(f => ({ ...f, practice_name: e.target.value }))}
                placeholder="Practice" style={{ flex: 1 }} />
              <input type="text" value={editForm.phone ?? ''}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone" style={{ width: 140 }} />
              <div className="manage-item__actions">
                <Button size="sm" variant="accent" onClick={saveEdit} disabled={saving}>✓</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
              </div>
            </>
          ) : (
            <>
              <div className="manage-item__name">
                {p.provider_name ?? p.practice_name ?? 'Unnamed'}
                {p.practice_name && p.provider_name && (
                  <span className="manage-item__meta">{p.practice_name}</span>
                )}
                <span className="badge">
                  {providerTypes.find((t: ProviderTypeRow) => t.id === p.provider_type_id)?.type_name ?? ''}
                </span>
              </div>
              <div className="manage-item__actions">
                <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Button>
                <Button
                  size="sm"
                  variant={p.is_active ? 'ghost' : 'accent'}
                  onClick={() => toggleActive(p.id, !p.is_active)}
                >
                  {p.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {providers.length === 0 && <p className="empty-state">No providers yet.</p>}

      <AddProviderForm
        providerTypes={providerTypes}
        onAdded={newProvider => setProviders(prev => [...prev, newProvider])}
      />
    </div>
  );
}

// ── Add provider form ─────────────────────────────────────────────────────────

function AddProviderForm({ providerTypes, onAdded }: Readonly<{
  providerTypes: ProviderTypeRow[];
  onAdded:       (p: unknown) => void;
}>) {
  const supabase = createClient();
  const [show,     setShow]     = useState(false);
  const [name,     setName]     = useState('');
  const [practice, setPractice] = useState('');
  const [phone,    setPhone]    = useState('');
  const [typeId,   setTypeId]   = useState('');
  const [saving,   setSaving]   = useState(false);

  const save = useCallback(async () => {
    if (!typeId) return;
    setSaving(true);
    try {
      const data = await createProvider(supabase, {
        provider_type_id: Number.parseInt(typeId),
        provider_name:    name.trim()     || null,
        practice_name:    practice.trim() || null,
        phone:            phone.trim()    || null,
      });
      onAdded(data);
      setName(''); setPractice(''); setPhone(''); setShow(false);
    } finally { setSaving(false); }
  }, [supabase, typeId, name, practice, phone, onAdded]);


