'use client';

/**
 * PeopleSettings — the People tab in Settings.
 *
 *   People            grouped by category (with the Assignable toggle)
 *   Info Groups       group → fields
 *   Logs              log → columns
 *   Lists, Checklists flat (title + optional label)
 *   Link to People    which of the above show on each person's page
 *
 * Nothing here is deleted: everything has is_active, so it's deactivated.
 * This component keeps the people and structure names that "Link to People"
 * shows in step with the lists above it.
 */

import { useState, useCallback } from 'react';
import { ManageableList } from '../ManageableList';
import { ManageItemMeta } from '@/components/ui';
import type { NormalizedChild } from '../HierarchicalList';
import { PeopleList, personFromChild } from './PeopleList';
import { InfoGroupSettings } from './InfoGroupSettings';
import { LogSettings } from './LogSettings';
import { PersonLinksSettings, type LinkableStructure } from './PersonLinksSettings';
import type { PersonLinks } from '@/types/dal';
import type {
  PersonRow, PeopleCategoryRow, InfoGroupRow, ItemListRow, LogSchemaRow, ChecklistRow,
  InfoFieldTypeRow, LogSchemaFieldRow, LogSchemaFieldOptionRow,
} from '@/types/schema';

interface Props {
  people:                PersonRow[];
  personLinks:           PersonLinks[];
  peopleCategories:      PeopleCategoryRow[];
  infoGroups:            InfoGroupRow[];
  infoFieldTypes:        InfoFieldTypeRow[];
  itemLists:             ItemListRow[];
  logSchemas:            LogSchemaRow[];
  logSchemaFields:       LogSchemaFieldRow[];
  logSchemaFieldOptions: LogSchemaFieldOptionRow[];
  checklists:            ChecklistRow[];
}

const added = (row: { id: number; name: string }): LinkableStructure => ({ ...row, is_active: true });

export function PeopleSettings({
  people: initialPeople, personLinks, peopleCategories,
  infoGroups, infoFieldTypes, itemLists, logSchemas, logSchemaFields, logSchemaFieldOptions, checklists,
}: Readonly<Props>) {
  const [people, setPeople] = useState<PersonRow[]>(initialPeople);
  const [structures, setStructures] = useState<Record<'info_group' | 'list' | 'log' | 'checklist', LinkableStructure[]>>(() => ({
    info_group: infoGroups.map(g => ({ id: g.id, name: g.group_title,     is_active: g.is_active })),
    list:       itemLists.map(l  => ({ id: l.id, name: l.list_title,      is_active: l.is_active })),
    log:        logSchemas.map(l => ({ id: l.id, name: l.log_title,       is_active: l.is_active })),
    checklist:  checklists.map(c => ({ id: c.id, name: c.checklist_title, is_active: c.is_active })),
  }));

  const upsertPerson = useCallback((child: NormalizedChild) => setPeople(prev =>
    prev.some(p => p.id === child.id)
      ? prev.map(p => p.id === child.id ? personFromChild(child, p) : p)
      : [...prev, personFromChild(child)]), []);

  const addStructure = (type: keyof typeof structures) => (row: { id: number; name: string }) =>
    setStructures(prev => ({ ...prev, [type]: [...prev[type], added(row)] }));

  return (
    <>
      <PeopleList
        people={initialPeople}
        categories={peopleCategories}
        onPersonAdded={upsertPerson}
        onPersonChange={upsertPerson}
      />

      <InfoGroupSettings groups={infoGroups} fields={infoFieldTypes} onGroupAdded={addStructure('info_group')} />

      <LogSettings
        logs={logSchemas}
        fields={logSchemaFields}
        options={logSchemaFieldOptions}
        onLogAdded={addStructure('log')}
      />

      <ManageableList
        title="Lists"
        description="Running lists per person. Each entry gets a text and a date (today by default), e.g. a Milestones list: “Lost 3rd tooth!”."
        tableName="item_lists"
        nameColumn="list_title"
        items={itemLists}
        addFields={[
          { key: 'list_title', label: 'List title', type: 'text', placeholder: 'e.g. Milestones', required: true },
          { key: 'list_label', label: 'Label', type: 'text', placeholder: 'Label (optional)', required: false },
        ]}
        renderName={(l: ItemListRow) => (
          <>{l.list_title}{l.list_label && <ManageItemMeta>{l.list_label}</ManageItemMeta>}</>
        )}
        onItemAdded={(l: ItemListRow) => addStructure('list')({ id: l.id, name: l.list_title })}
      />

      <ManageableList
        title="Checklists"
        description="Checklists per person; their items are added on each person's page."
        tableName="checklists"
        nameColumn="checklist_title"
        items={checklists}
        addFields={[
          { key: 'checklist_title', label: 'Checklist title', type: 'text', placeholder: 'e.g. Morning Routine', required: true },
          { key: 'checklist_label', label: 'Label', type: 'text', placeholder: 'Label (optional)', required: false },
        ]}
        renderName={(c: ChecklistRow) => (
          <>{c.checklist_title}{c.checklist_label && <ManageItemMeta>{c.checklist_label}</ManageItemMeta>}</>
        )}
        onItemAdded={(c: ChecklistRow) => addStructure('checklist')({ id: c.id, name: c.checklist_title })}
      />

      <PersonLinksSettings
        people={people}
        categories={peopleCategories}
        initialLinks={personLinks}
        structures={structures}
      />
    </>
  );
}
