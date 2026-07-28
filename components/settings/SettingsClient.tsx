'use client';

import { useState }               from 'react';
import { TabBar }                  from '@/components/ui/Controls';
import { ManageableList }          from './ManageableList';
import { SymptomSettings }         from './SymptomSettings';
import { JournalSettings }         from './JournalSettings';
import { PeopleStructureSettings } from './PeopleStructureSettings';
import { TrackableSettings }       from './TrackableSettings';
import { ChartSettings }           from './ChartSettings';
import { LastTimeSettings }        from '@/components/last-time/LastTimeSettings';
import { ProviderSettings }        from '@/components/providers/ProviderSettings';
import { IconSettings }            from './IconSettings';
import { IntegrationsSettings }   from './IntegrationsSettings';
import type {
  SymptomCategoryWithTypes,
  JournalCategoryWithPrompts,
  ChartDefinitionDetail,
  ChartCategoryRow,
  PersonLinks,
} from '@/types/dal';
import type {
  DailyTrackableRow,
  InfoGroupRow,
  ItemListRow,
  LogSchemaRow,
  ChecklistRow,
  PersonRow,
  ProviderRow,
  ProviderTypeRow,
  TagRow,
  IntentionRow,
  SleepEventTypeRow,
  MediaTypeRow,
  MediaGenreRow,
  MediaStatusRow,
  IconRow,
  CalendarTokenRow,
  PeopleCategoryRow,
} from '@/types/schema';

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId =
  | 'daily'
  | 'tracking'
  | 'charts'
  | 'lasttime'
  | 'health'
  | 'journal'
  | 'providers'
  | 'people'
  | 'icons'
  | 'integrations';

const TABS = [
  { id: 'daily',     label: '📅 Daily'     },
  { id: 'tracking',  label: '📊 Tracking'  },
  { id: 'charts',    label: '📈 Charts'    },
  { id: 'lasttime',  label: '⏱ Last Time'  },
  { id: 'health',    label: '🩺 Health'    },
  { id: 'journal',   label: '📔 Journal'   },
  { id: 'providers', label: '🏥 Providers' },
  { id: 'people',    label: '👤 People'    },
  { id: 'icons',         label: '✦ Icons'        },
  { id: 'integrations',  label: '🔗 Integrations' },
] as const satisfies { id: TabId; label: string }[];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  // Icons
  icons:                IconRow[];
  // People
  peopleCategories:     PeopleCategoryRow[];
  // Integrations
  calendarToken:        CalendarTokenRow | null;
  // Tracking & charts
  trackables:           DailyTrackableRow[];
  trackableCategories:  import('@/types/schema').TrackableCategoryRow[];
  chartDefinitions:  ChartDefinitionDetail[];
  chartCategories:   ChartCategoryRow[];
  // Daily
  tags:              TagRow[];
  intentions:        IntentionRow[];
  // Health
  symptomCategories: SymptomCategoryWithTypes[];
  sleepEventTypes:   SleepEventTypeRow[];
  // Journal
  journalCategories:       JournalCategoryWithPrompts[];
  weeklyJournalCategories: import('@/types/dal').WeeklyJournalCategoryWithPrompts[];
  // Providers
  providers:         ProviderRow[];
  providerTypes:     ProviderTypeRow[];
  // Last Time
  mediaTypes:        MediaTypeRow[];
  mediaGenres:       MediaGenreRow[];
  mediaStatuses:     MediaStatusRow[];
  // People structure
  people:            PersonRow[];
  personLinks:       PersonLinks[];
  infoGroups:        InfoGroupRow[];
  itemLists:         ItemListRow[];
  logSchemas:        LogSchemaRow[];
  checklists:        ChecklistRow[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsClient({
  icons,
  calendarToken,
  peopleCategories,
  trackables, trackableCategories, chartDefinitions, chartCategories,
  tags, intentions,
  symptomCategories, sleepEventTypes,
  journalCategories,
  weeklyJournalCategories,
  providers, providerTypes,
  mediaTypes, mediaGenres, mediaStatuses,
  people, personLinks, infoGroups, itemLists, logSchemas, checklists,
}: Readonly<Props>) {
  const [tab, setTab] = useState<TabId>('daily');
  // Lifted trackables state — allows ChartSettings dropdown to update when
  // new metrics are added in TrackableSettings without a full page refresh
  const [liveTrackables, setLiveTrackables] = useState<DailyTrackableRow[]>(trackables);

  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* Tab panels — always rendered, CSS-hidden when inactive to preserve local state */}
      <div className="settings-tab-content">

        <div className={tab === 'daily' ? '' : 'hidden'}>
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
            renderName={item => <em>&ldquo;{item.value}&rdquo;</em>}
          />
        </div>

        <div className={tab === 'tracking' ? '' : 'hidden'}>
          <TrackableSettings
            trackables={liveTrackables}
            categories={trackableCategories}
            icons={icons}
            onTrackableAdded={(t: DailyTrackableRow) => setLiveTrackables(prev => [...prev, t])}
          />
        </div>

        <div className={tab === 'charts' ? '' : 'hidden'}>
          <ChartSettings
            chartDefinitions={chartDefinitions}
            trackables={liveTrackables.filter(t => t.is_active)}
            categories={chartCategories}
            icons={icons}
          />
        </div>

        <div className={tab === 'lasttime' ? '' : 'hidden'}>
          <LastTimeSettings
            trackables={liveTrackables.filter(t => t.track_type === 'boolean' && t.is_active)}
            mediaTypes={mediaTypes}
            mediaGenres={mediaGenres}
            mediaStatuses={mediaStatuses}
            icons={icons}
          />
        </div>

        <div className={tab === 'health' ? '' : 'hidden'}>
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
        </div>

        <div className={tab === 'journal' ? '' : 'hidden'}>
          <JournalSettings categories={journalCategories} weeklyCategories={weeklyJournalCategories} />
        </div>

        <div className={tab === 'providers' ? '' : 'hidden'}>
          <ProviderSettings providers={providers} providerTypes={providerTypes} />
        </div>

        <div className={tab === 'people' ? '' : 'hidden'}>
          <PeopleStructureSettings
            people={people}
            personLinks={personLinks}
            infoGroups={infoGroups}
            itemLists={itemLists}
            logSchemas={logSchemas}
            checklists={checklists}
            peopleCategories={peopleCategories}
          />
        </div>

        <div className={tab === 'icons' ? '' : 'hidden'}>
          <IconSettings icons={icons} />
        </div>

        <div className={tab === 'integrations' ? '' : 'hidden'}>
          <IntegrationsSettings token={calendarToken} />
        </div>

      </div>
    </div>
  );
}