import { createClient }    from '@/lib/supabase/server';
import {
  getTrackableCategories,
  getJournalCategoriesWithPrompts,
  getProviderTypes,
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
import { getTrackableLinks } from '@/lib/dal/trackables';
import { getSections }     from '@/lib/dal/placement';
import { getEveryPrescription } from '@/lib/dal/prescriptions';
import { getPeopleCategories } from '@/lib/dal/reference';
import { getCalendarToken } from '@/lib/dal/calendar';
import { getWeeklyJournalCategories } from '@/lib/dal/weekly-journal';
import type { PersonLinks } from '@/types/dal';
import { SettingsClient } from '@/components/settings/SettingsClient';
import { Header, PageBody } from '@/components/layout';
import { SETTINGS_TABS } from '@/lib/constants/nav';

export default async function SettingsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ tab?: string }> }>) {
  const { tab } = await searchParams;
  const initialTab = SETTINGS_TABS.find(t => t.id === tab)?.id;
  const supabase = await createClient();

  const [
    icons,
    journalCategories,
    providerTypes,
    people,
    peopleCategories,
    trackables,
    trackableCategories,
    trackableLinks,
    sections,
    chartDefinitions,
    chartCategories,
    settingsData,
    weeklyJournalCategories,
    calendarToken,
  ] = await Promise.all([
    getIconsRef(supabase, true),
    getJournalCategoriesWithPrompts(supabase, true),
    getProviderTypes(supabase, true),
    getAllPeople(supabase, true),
    getPeopleCategories(supabase, true),
    getTrackables(supabase, true),
    getTrackableCategories(supabase, true),
    getTrackableLinks(supabase),
    getSections(supabase, undefined, true),
    getChartDefinitions(supabase, true),
    getChartCategories(supabase, true),
    getSettingsPageData(supabase),
    getWeeklyJournalCategories(supabase, true),
    getCalendarToken(supabase),
  ]);

  const [mediaTypes, mediaGenres, mediaStatuses, prescriptions] = await Promise.all([
    getMediaTypes(supabase),
    getMediaGenres(supabase),
    getMediaStatuses(supabase),
    getEveryPrescription(supabase),
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
        initialTab={initialTab}
        icons={icons}
        trackables={trackables}
        trackableCategories={trackableCategories}
        trackableLinks={trackableLinks}
        prescriptions={prescriptions}
        sections={sections}
        chartDefinitions={chartDefinitions}
        chartCategories={chartCategories}
        tags={settingsData.tags}
        intentions={settingsData.intentions}
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
        infoFieldTypes={settingsData.infoFieldTypes}
        logSchemaFields={settingsData.logSchemaFields}
        logSchemaFieldOptions={settingsData.logSchemaFieldOptions}
        weeklyJournalCategories={weeklyJournalCategories}
        calendarToken={calendarToken}
      />
    </PageBody>
  );
}