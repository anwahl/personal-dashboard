import { createClient }   from '@/lib/supabase/server';
import { getReferenceData, getJournalCategoriesWithPrompts, getProviderTypes } from '@/lib/dal/reference';
import { getAllPeople }   from '@/lib/dal/people';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();

  const [reference, journalCategories, providerTypes, people] = await Promise.all([
    getReferenceData(supabase),
    getJournalCategoriesWithPrompts(supabase, true),   // include inactive
    getProviderTypes(supabase, true),
    getAllPeople(supabase),
  ]);

  // Fetch providers
  const { data: providers } = await supabase
    .from('providers').select('*').order('provider_name');

  // Fetch all structure entities (active + inactive for settings)
  const [
    { data: infoGroups }, { data: itemLists },
    { data: logSchemas }, { data: checklists },
    { data: igLinks }, { data: listLinks },
    { data: logLinks }, { data: clLinks },
  ] = await Promise.all([
    supabase.from('info_groups').select('id, group_title, is_active').order('sort_order'),
    supabase.from('item_lists').select('id, list_title, list_label, is_active').order('sort_order'),
    supabase.from('log_schemas').select('id, log_title, is_active').order('sort_order'),
    supabase.from('checklists').select('id, checklist_title, checklist_label, is_active').order('sort_order'),
    supabase.from('person_info_group_links').select('person_id, info_group_id'),
    supabase.from('person_item_list_links').select('person_id, list_id'),
    supabase.from('person_log_links').select('person_id, log_id'),
    supabase.from('person_checklist_links').select('person_id, checklist_id'),
  ]);

  // Build per-person link maps
  const personLinks = people.map(p => ({
    person: p,
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
        habits={reference.habits}
        tags={reference.tags}
        intentions={await supabase.from('intentions').select('*').order('id').then(r => r.data ?? [])}
        symptomCategories={reference.symptomCategories}
        sleepEventTypes={reference.sleepEventTypes}
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
