'use client';

import { useState }               from 'react';
import { TabBar }                  from '@/components/ui';
import { ManageableList }          from './ManageableList';
import { JournalSettings }         from './JournalSettings';
import { PeopleSettings }          from './people/PeopleSettings';
import { TrackableSettings }       from './TrackableSettings';
import { LayoutSettings }          from './LayoutSettings';
import { ChartSettings }           from './ChartSettings';
import { LastTimeSettings }        from '@/components/last-time/LastTimeSettings';
import { ProviderSettings }        from '@/components/settings/ProviderSettings';
import { IconSettings }            from './IconSettings';
import { IntegrationsSettings }   from './IntegrationsSettings';
import type {
  JournalCategoryWithPrompts,
  SectionDetail,
  TrackableDetail,
  ChartDefinitionDetail,
  ChartCategoryRow,
  PersonLinks,
} from '@/types/dal';
import type {
  TrackableCategoryRow,
  TrackableToCategoryRow,
  InfoGroupRow,
  ItemListRow,
  LogSchemaRow,
  ChecklistRow,
  InfoFieldTypeRow,
  LogSchemaFieldRow,
  LogSchemaFieldOptionRow,
  PersonRow,
  ProviderRow,
  ProviderTypeRow,
  TagRow,
  IntentionRow,
  MediaTypeRow,
  MediaGenreRow,
  MediaStatusRow,
  IconRow,
  CalendarTokenRow,
  PeopleCategoryRow,
} from '@/types/schema';
import { SETTINGS_TABS, SettingsTabId } from '@/lib/constants/nav';
import { CHARTABLE_TYPES } from '@/lib/dal/analytics';



// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Tab to open first (from ?tab=…). Default: Daily. */
  initialTab?:       SettingsTabId;
  // Icons
  icons:                IconRow[];
  // People
  peopleCategories:     PeopleCategoryRow[];
  // Integrations
  calendarToken:        CalendarTokenRow | null;
  // Tracking, layout & charts
  trackables:           TrackableDetail[];
  trackableCategories:  TrackableCategoryRow[];
  trackableLinks:       TrackableToCategoryRow[];
  prescriptions:        import('@/types/dal').PrescriptionDetail[];
  sections:             SectionDetail[];
  chartDefinitions:  ChartDefinitionDetail[];
  chartCategories:   ChartCategoryRow[];
  // Daily
  tags:              TagRow[];
  intentions:        IntentionRow[];
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
  infoFieldTypes:        InfoFieldTypeRow[];
  logSchemaFields:       LogSchemaFieldRow[];
  logSchemaFieldOptions: LogSchemaFieldOptionRow[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsClient({
  initialTab = 'daily',
  icons,
  calendarToken,
  peopleCategories,
  trackables, trackableCategories, trackableLinks, prescriptions, sections, chartDefinitions, chartCategories,
  tags, intentions,
  journalCategories,
  weeklyJournalCategories,
  providers, providerTypes,
  mediaTypes, mediaGenres, mediaStatuses,
  people, personLinks, infoGroups, itemLists, logSchemas, checklists,
  infoFieldTypes, logSchemaFields, logSchemaFieldOptions,
}: Readonly<Props>) {
  const [tab, setTab] = useState<SettingsTabId>(initialTab);
  // Lifted from TrackableSettings so Charts, Last Time and Layout see
  // trackables and categories added there without a page refresh.
  const [liveTrackables, setLiveTrackables] = useState<TrackableDetail[]>(trackables);
  const [liveCategories, setLiveCategories] = useState<TrackableCategoryRow[]>(trackableCategories);

  return (
    <div>
      <TabBar label="Settings sections" tabs={SETTINGS_TABS} active={tab} onChange={setTab} />

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
            trackables={trackables}
            categories={trackableCategories}
            links={trackableLinks}
            prescriptions={prescriptions}
            people={people}
            icons={icons}
            onTrackablesChange={setLiveTrackables}
            onCategoriesChange={setLiveCategories}
          />
        </div>

        <div className={tab === 'layout' ? '' : 'hidden'}>
          <LayoutSettings sections={sections} categories={liveCategories} />
        </div>

        <div className={tab === 'charts' ? '' : 'hidden'}>
          <ChartSettings
            chartDefinitions={chartDefinitions}
            trackables={liveTrackables.filter(t => t.is_active && CHARTABLE_TYPES.includes(t.track_type))}
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

        <div className={tab === 'journal' ? '' : 'hidden'}>
          <JournalSettings categories={journalCategories} weeklyCategories={weeklyJournalCategories} />
        </div>

        <div className={tab === 'providers' ? '' : 'hidden'}>
          <ProviderSettings providers={providers} providerTypes={providerTypes} />
        </div>

        <div className={tab === 'people' ? '' : 'hidden'}>
          <PeopleSettings
            people={people}
            personLinks={personLinks}
            peopleCategories={peopleCategories}
            infoGroups={infoGroups}
            infoFieldTypes={infoFieldTypes}
            itemLists={itemLists}
            logSchemas={logSchemas}
            logSchemaFields={logSchemaFields}
            logSchemaFieldOptions={logSchemaFieldOptions}
            checklists={checklists}
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