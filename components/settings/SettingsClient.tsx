'use client';

import { useState }              from 'react';
import { ManageableList }        from './ManageableList';
import { SymptomSettings }       from './SymptomSettings';
import { JournalSettings }       from './JournalSettings';
import { PeopleStructureSettings } from './PeopleStructureSettings';
import type { SymptomCategoryWithTypes, JournalCategoryWithPrompts } from '@/types/dal';
import type { PersonRow, ProviderTypeRow } from '@/types/schema';

// Re-export TabBar from ui for convenience
function TabBarLocal({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
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

type TabId = 'daily' | 'health' | 'journal' | 'providers' | 'people';

const TABS: { id: TabId; label: string }[] = [
  { id: 'daily',     label: '📅 Daily'     },
  { id: 'health',    label: '🩺 Health'    },
  { id: 'journal',   label: '📔 Journal'   },
  { id: 'providers', label: '🏥 Providers' },
  { id: 'people',    label: '👤 People'    },
];

interface Props {
  // Daily
  habits:            any[];
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
  // People structure
  people:            PersonRow[];
  personLinks:       any[];
  infoGroups:        any[];
  itemLists:         any[];
  logSchemas:        any[];
  checklists:        any[];
}

export function SettingsClient({
  habits, tags, intentions,
  symptomCategories, sleepEventTypes,
  journalCategories,
  providers, providerTypes,
  people, personLinks, infoGroups, itemLists, logSchemas, checklists,
}: Props) {
  const [tab, setTab] = useState<TabId>('daily');

  return (
    <div>
      <TabBarLocal tabs={TABS} active={tab} onChange={id => setTab(id as TabId)} />

      <div className="settings-tab-content">

        {/* ── DAILY ─────────────────────────────────────────────────────────────*/}
        {tab === 'daily' && (
          <>
            <ManageableList
              title="Habits"
              description="Tracked daily on the log page. Add emoji for quick recognition."
              tableName="habits"
              nameColumn="habit_name"
              items={habits}
              addFields={[
                { key: 'emoji',      label: 'Emoji', type: 'text', placeholder: '💧', width: 64 },
                { key: 'habit_name', label: 'Habit name', type: 'text', placeholder: 'e.g. Water', required: true },
              ]}
              renderName={item => <>{item.emoji} {String(item.habit_name)}</>}
            />

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
        )}

        {/* ── HEALTH ────────────────────────────────────────────────────────────*/}
        {tab === 'health' && (
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
        )}

        {/* ── JOURNAL ───────────────────────────────────────────────────────────*/}
        {tab === 'journal' && (
          <JournalSettings categories={journalCategories} />
        )}

        {/* ── PROVIDERS ─────────────────────────────────────────────────────────*/}
        {tab === 'providers' && (
          <div className="settings-section">
            <div className="settings-section__header">
              <span className="settings-section__title">Providers</span>
            </div>
            <p className="settings-section__desc">
              Healthcare providers linked to appointments and prescriptions.
            </p>

            {/* Existing providers */}
            {providers.map((p: any) => (
              <div key={p.id} className="manage-item">
                <div style={{ flex: 1 }}>
                  <span className="manage-item__name">{p.provider_name ?? p.practice_name ?? 'Unnamed'}</span>
                  {p.practice_name && p.provider_name && (
                    <span className="manage-item__meta" style={{ marginLeft: 8 }}>{p.practice_name}</span>
                  )}
                  <span className="badge" style={{ marginLeft: 8 }}>
                    {providerTypes.find(t => t.id === p.provider_type_id)?.type_name ?? ''}
                  </span>
                </div>
              </div>
            ))}

            {providers.length === 0 && <p className="empty-state">No providers yet.</p>}

            {/* Add provider — inline mini-form */}
            <AddProviderForm providerTypes={providerTypes} onAdded={() => {}} />
          </div>
        )}

        {/* ── PEOPLE ────────────────────────────────────────────────────────────*/}
        {tab === 'people' && (
          <PeopleStructureSettings
            people={people}
            personLinks={personLinks}
            infoGroups={infoGroups}
            itemLists={itemLists}
            logSchemas={logSchemas}
            checklists={checklists}
          />
        )}
      </div>
    </div>
  );
}

// ── Add provider form (inline) ────────────────────────────────────────────────

import { createClient as _createClient } from '@/lib/supabase/client';

function AddProviderForm({ providerTypes, onAdded }: { providerTypes: ProviderTypeRow[]; onAdded: (p: unknown) => void }) {
  const supabase = _createClient();
  const [show,   setShow]   = useState(false);
  const [name,   setName]   = useState('');
  const [practice, setPractice] = useState('');
  const [phone,  setPhone]  = useState('');
  const [typeId, setTypeId] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!typeId) return;
    setSaving(true);
    try {
      const { data } = await supabase.from('providers').insert({
        provider_type_id: parseInt(typeId),
        provider_name:    name.trim()    || null,
        practice_name:    practice.trim() || null,
        phone:            phone.trim()   || null,
      }).select().single();
      if (data) { onAdded(data); setName(''); setPractice(''); setPhone(''); setShow(false); }
    } finally { setSaving(false); }
  };

  if (!show) {
    return (
      <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={() => setShow(true)}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}>
          + Add Provider
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div className="field-grid">
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
          <select value={typeId} onChange={e => setTypeId(e.target.value)}>
            <option value="">Select type…</option>
            {providerTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Provider name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Smith" />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Practice</label>
          <input type="text" value={practice} onChange={e => setPractice(e.target.value)} placeholder="Helena Family Medicine" />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Phone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(406) 555-1234" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={save} disabled={saving || !typeId}
          className={`btn btn--sm${!saving && typeId ? ' btn--accent' : ''}`}>
          {saving ? 'Saving…' : 'Add Provider'}
        </button>
        <button type="button" onClick={() => setShow(false)} className="btn btn--sm btn--ghost">Cancel</button>
      </div>
    </div>
  );
}
