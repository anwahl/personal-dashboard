import { createClient }    from '@/lib/supabase/server';
import {
  getTrackableCategories,
  getSymptomCategoriesWithTypes,
  getJournalCategoriesWithPrompts,
  getProviderTypes,
  getSleepEventTypes,
  getTrackables,
  getChartDefinitions,
  getChartCategories,
  getSettingsPageData,
  getMediaTypes, 
  getMediaGenres, 
  getMediaStatuses
} from '@/lib/dal/reference';
import { getAllPeople }    from '@/lib/dal/people';
import { getWeeklyJournalCategories } from '@/lib/dal/weekly-journal';
import type { PersonLinks } from '@/types/dal';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();

  const [
    symptomCategories,
    journalCategories,
    providerTypes,
    sleepEventTypes,
    people,
    trackables,
    trackableCategories,
    chartDefinitions,
    chartCategories,
    settingsData,
    weeklyJournalCategories,
  ] = await Promise.all([
    getSymptomCategoriesWithTypes(supabase),
    getJournalCategoriesWithPrompts(supabase),
    getProviderTypes(supabase),
    getSleepEventTypes(supabase),
    getAllPeople(supabase),
    getTrackables(supabase, true),
    getTrackableCategories(supabase, true),
    getChartDefinitions(supabase),
    getChartCategories(supabase),
    getSettingsPageData(supabase),
    getWeeklyJournalCategories(supabase, true),
  ]);

  const [mediaTypes, mediaGenres, mediaStatuses] = await Promise.all([
    getMediaTypes(supabase),
    getMediaGenres(supabase),
    getMediaStatuses(supabase),
  ]);

  const personLinks: PersonLinks[] = people.map(person => ({
    person,
    infoGroupIds:  settingsData.personInfoGroupLinks.filter(l => l.person_id === person.id).map(l => l.info_group_id),
    listIds:       settingsData.personItemListLinks.filter(l => l.person_id === person.id).map(l => l.list_id),
    logIds:        settingsData.personLogLinks.filter(l => l.person_id === person.id).map(l => l.log_id),
    checklistIds:  settingsData.personChecklistLinks.filter(l => l.person_id === person.id).map(l => l.checklist_id),
  }));

  return (
    <div className="page-content">
      <h1 className="page-header__title">Settings</h1>
      <SettingsClient
        trackables={trackables}
        trackableCategories={trackableCategories}
        chartDefinitions={chartDefinitions}
        chartCategories={chartCategories}
        tags={settingsData.tags}
        intentions={settingsData.intentions}
        symptomCategories={symptomCategories}
        sleepEventTypes={sleepEventTypes}
        journalCategories={journalCategories}
        providers={settingsData.providers}
        providerTypes={providerTypes}
        mediaTypes={mediaTypes}
        mediaGenres={mediaGenres}
        mediaStatuses={mediaStatuses}
        people={people}
        personLinks={personLinks}
        infoGroups={settingsData.infoGroups}
        itemLists={settingsData.itemLists}
        logSchemas={settingsData.logSchemas}
        checklists={settingsData.checklists}
        weeklyJournalCategories={weeklyJournalCategories}
      />
    </div>
  );
}