import { createClient }    from '@/lib/supabase/server';
import {
  getSymptomCategoriesWithTypes,
  getJournalCategoriesWithPrompts,
  getProviderTypes,
  getSleepEventTypes,
} from '@/lib/dal/reference';
import { getAllPeople }    from '@/lib/dal/people';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();

  // Fetch ALL items (active + inactive) for settings — use includeInactive=true
  const [
    symptomCategories, journalCategories, providerTypes,
    sleepEventTypes, people,
  ] = await Promise.all([
    getSymptomCategoriesWithTypes(supabase, true),
    getJournalCategoriesWithPrompts(supabase, true),
    getProviderTypes(supabase, true),
    getSleepEventTypes(supabase, true),
    getAllPeople(supabase),
  ]);

  // Fetch simple reference tables with all rows (active + inactive)
  const [
    { data: habits },
    { data: tags },
    { data: intentions },
    { data: providers },
    { data: infoGroups },
    { data: itemLists },
    { data: logSchemas },
    { data: checklists },
    { data: igLinks },
    { data: listLinks },
    { data: logLinks },
    { data: clLinks },
  ] = await Promise.all([
    supabase.from('habits').select('*').order('sort_order'),
    supabase.from('tags').select('*').order('tag_value'),
    supabase.from('intentions').select('*').order('id'),
    supabase.from('providers').select('*').order('provider_name'),
    supabase.from('info_groups').select('*').order('sort_order'),
    supabase.from('item_lists').select('*').order('sort_order'),
    supabase.from('log_schemas').select('*').order('sort_order'),
    supabase.from('checklists').select('*').order('sort_order'),
    supabase.from('person_info_group_links').select('person_id, info_group_id'),
    supabase.from('person_item_list_links').select('person_id, list_id'),
    supabase.from('person_log_links').select('person_id, log_id'),
    supabase.from('person_checklist_links').select('person_id, checklist_id'),
  ]);

  const personLinks = people.map(p => ({
    person:       p,
    infoGroupIds: (igLinks   ?? []).filter((l: any) => l.person_id === p.id).map((l: any) => l.info_group_id),
    listIds:      (listLinks ?? []).filter((l: any) => l.person_id === p.id).map((l: any) => l.list_id),
    logIds:       (logLinks  ?? []).filter((l: any) => l.person_id === p.id).map((l: any) => l.log_id),
    checklistIds: (clLinks   ?? []).filter((l: any) => l.person_id === p.id).map((l: any) => l.checklist_id),
  }));

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">⚙️ Settings</h1>
      </div>
      <SettingsClient
        habits={habits ?? []}
        tags={tags ?? []}
        intentions={intentions ?? []}
        symptomCategories={symptomCategories}
        sleepEventTypes={sleepEventTypes}
        journalCategories={journalCategories}
        providers={providers ?? []}
        providerTypes={providerTypes}
        people={people}
        personLinks={personLinks}
        infoGroups={infoGroups ?? []}
        itemLists={itemLists ?? []}
        logSchemas={logSchemas ?? []}
        checklists={checklists ?? []}
      />
    </div>
  );
}
