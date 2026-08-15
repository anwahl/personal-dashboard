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
  getMediaStatuses,
  getIconsRef,
} from '@/lib/dal/reference';
import { getAllPeople }    from '@/lib/dal/people';
import { getPeopleCategories } from '@/lib/dal/reference';
import { getCalendarToken } from '@/lib/dal/calendar';
import { getWeeklyJournalCategories } from '@/lib/dal/weekly-journal';
import type { PersonLinks } from '@/types/dal';
import { SettingsClient } from '@/components/settings/SettingsClient';
import { Header, PageBody } from '@/components/layout';

export default async function SettingsPage() {
  const supabase = await createClient();

  const [
    icons,
    symptomCategories,
    journalCategories,
    providerTypes,
    sleepEventTypes,
    people,
    peopleCategories,
    trackables,
    trackableCategories,
    chartDefinitions,
    chartCategories,
    settingsData,
    weeklyJournalCategories,
    calendarToken,
  ] = await Promise.all([
    getIconsRef(supabase, true),
    getSymptomCategoriesWithTypes(supabase),
    getJournalCategoriesWithPrompts(supabase),
    getProviderTypes(supabase),
    getSleepEventTypes(supabase),
    getAllPeople(supabase),
    getPeopleCategories(supabase, true),
    getTrackables(supabase, true),
    getTrackableCategories(supabase, true),
    getChartDefinitions(supabase),
    getChartCategories(supabase),
    getSettingsPageData(supabase),
    getWeeklyJournalCategories(supabase, true),
    getCalendarToken(supabase),
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
    <PageBody>
      <Header title='Settings' />
      <SettingsClient
        icons={icons}
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
        peopleCategories={peopleCategories}
        personLinks={personLinks}
        infoGroups={settingsData.infoGroups}
        itemLists={settingsData.itemLists}
        logSchemas={settingsData.logSchemas}
        checklists={settingsData.checklists}
        weeklyJournalCategories={weeklyJournalCategories}
        calendarToken={calendarToken}
      />
    </PageBody>
  );
}