'use client';

/**
 * components/people/PeopleNavTabs.tsx
 *
 * Tabbed nav for the people section. Each category is a tab; the active
 * tab shows that category's people as badge links. Defaults to the tab
 * containing the currently-viewed person.
 */

import { useState }                  from 'react';
import { TabBar }                     from '@/components/ui/Controls';
import { personSlug }                 from '@/lib/dal/people';
import type { PersonRow, PeopleCategoryRow } from '@/types/schema';

interface Props {
  people:           PersonRow[];
  categories:       PeopleCategoryRow[];
  currentSlug:      string;
  initialCategory:  number | null;  // category_id of the current person
}

export function PeopleNavTabs({
  people, categories, currentSlug, initialCategory,
}: Readonly<Props>) {
  // Default to the current person's category, or first category if uncategorized
  const defaultTab = initialCategory ?? categories[0]?.id ?? null;
  const [activeTab, setActiveTab] = useState<number | null>(defaultTab);

  const tabs = [
    ...categories.map(c => ({ id: String(c.id), label: c.category_name })),
    // Include 'Other' tab only if there are uncategorized people
    ...(people.some(p => !p.category_id) ? [{ id: 'other', label: 'Other' }] : []),
  ];

  const visible = activeTab === null
    ? people.filter(p => !p.category_id)
    : people.filter(p =>
        activeTab.toString() === 'other' ? !p.category_id : p.category_id === activeTab
      );

  return (
    <nav style={{ marginBottom: 20 }}>
      <TabBar
        tabs={tabs}
        active={activeTab !== null ? String(activeTab) : 'other'}
        onChange={id => setActiveTab(id === 'other' ? null : Number(id))}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {visible.map(p => {
          const slug   = personSlug(p.person_name);
          const active = slug === currentSlug;
          return (
            <a
              key={p.id}
              href={`/people/${slug}`}
              className={`badge${active ? ' badge--accent' : ''}`}
              style={{ textDecoration: 'none', padding: '5px 14px', fontSize: '0.82rem' }}
            >
              {p.person_name}
            </a>
          );
        })}
        {visible.length === 0 && (
          <p style={{ color: 'var(--text-faint)', fontSize: '0.82rem' }}>No people in this category yet.</p>
        )}
      </div>
    </nav>
  );
}
