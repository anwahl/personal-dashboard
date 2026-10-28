'use client';

/**
 * PersonLinksSettings — which info groups, lists, logs and checklists show
 * on each person's page. One chip per structure; tap to link or unlink.
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { togglePersonStructureLink } from '@/lib/dal/people';
import {
  CardSection, CardSectionLabel, CardSectionMeta, ChipSelect, EmptyState, InputField, SectionCard,
} from '@/components/ui';
import type { PersonLinks } from '@/types/dal';
import type { PersonRow, PeopleCategoryRow } from '@/types/schema';

type StructureType = 'info_group' | 'list' | 'log' | 'checklist';

/** A linkable structure: just what this section needs. */
export interface LinkableStructure {
  id:        number;
  name:      string;
  is_active: boolean;
}

const LINK_KEY: Record<StructureType, keyof Omit<PersonLinks, 'person'>> = {
  info_group: 'infoGroupIds', list: 'listIds', log: 'logIds', checklist: 'checklistIds',
};

export function PersonLinksSettings({
  people, categories, initialLinks, structures,
}: Readonly<{
  people:       PersonRow[];
  categories:   PeopleCategoryRow[];
  initialLinks: PersonLinks[];
  structures:   Record<StructureType, LinkableStructure[]>;
}>) {
  const supabase = createClient();
  const [links, setLinks] = useState<PersonLinks[]>(initialLinks);

  const groups: { type: StructureType; label: string }[] = [
    { type: 'info_group', label: 'Info groups' },
    { type: 'list',       label: 'Lists' },
    { type: 'log',        label: 'Logs' },
    { type: 'checklist',  label: 'Checklists' },
  ];
  const anyStructures = groups.some(g => structures[g.type].some(s => s.is_active));

  const toggle = async (person: PersonRow, type: StructureType, id: number, link: boolean) => {
    await togglePersonStructureLink(supabase, person.id, type, id, link);
    const key = LINK_KEY[type];
    setLinks(prev => {
      const existing = prev.find(l => l.person.id === person.id)
        ?? { person, infoGroupIds: [], listIds: [], logIds: [], checklistIds: [] };
      const ids = existing[key];
      const next = { ...existing, [key]: link ? [...ids, id] : ids.filter(x => x !== id) };
      return prev.some(l => l.person.id === person.id)
        ? prev.map(l => l.person.id === person.id ? next : l)
        : [...prev, next];
    });
  };

  return (
    <SectionCard title="Link to People" description="Choose which structures appear on each person's page.">
      {!anyStructures && <EmptyState>Create an info group, list, log or checklist above to link it here.</EmptyState>}
      {anyStructures && people.filter(p => p.is_active).map(person => {
        const pl  = links.find(l => l.person.id === person.id);
        const cat = categories.find(c => c.id === person.category_id);
        return (
          <CardSection key={person.id}>
            <CardSectionLabel>
              {person.person_name}
              {cat && <CardSectionMeta>· {cat.category_name}</CardSectionMeta>}
            </CardSectionLabel>
            {groups.map(({ type, label }) => {
              const options = structures[type].filter(s => s.is_active);
              if (options.length === 0) return null;
              return (
                <InputField key={type} label={label}>
                  <ChipSelect
                    label={`${label} for ${person.person_name}`}
                    options={options.map(s => ({ value: s.id, label: s.name }))}
                    selected={pl?.[LINK_KEY[type]] ?? []}
                    onToggle={(id, on) => toggle(person, type, id, on)}
                  />
                </InputField>
              );
            })}
          </CardSection>
        );
      })}
    </SectionCard>
  );
}
