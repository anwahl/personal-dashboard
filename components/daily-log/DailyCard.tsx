'use client';

/**
 * components/daily-log/DailyCard.tsx
 *
 * The daily page's tabs: the DAILY sections (Settings → Layout), each
 * drawing its cards (LayoutCard): trackable categories by type and
 * components, all for the page's date. Laid out like the other tabbed pages
 * (tab bar, then the tab's cards).
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { TabBar, EmptyState } from '@/components/ui';
import type { TrackableActions } from './TrackableInputs';
import { LayoutCard }       from '@/components/sections/LayoutCard';
import type { ReferenceData, SectionDetail } from '@/types/dal';
import type { ModuleData }  from '@/lib/dal/modules';
import { sectionTabId, type DailyTabId } from '@/lib/constants/nav';

// ── DailyCard (main export) ───────────────────────────────────────────────────

interface Props {
  sections:   SectionDetail[];
  moduleData: ModuleData;
  actions:    TrackableActions;
  reference:  ReferenceData;
}

export function DailyCard({ sections, moduleData, actions, reference }: Readonly<Props>) {
  const tabs = sections.map(s => ({ id: sectionTabId(s.id), label: s.name }));
  const toTab = (value: string | null): DailyTabId | null => tabs.find(t => t.id === value)?.id ?? null;

  // The open tab follows ?tab= (e.g. from Quick add's shortcuts) and is
  // written back to the URL without a server round trip.
  const tabParam = useSearchParams().get('tab');
  const [tab, setTab] = useState<DailyTabId | null>(() => toTab(tabParam) ?? tabs[0]?.id ?? null);

  useEffect(() => {
    const fromUrl = toTab(tabParam);
    if (fromUrl) setTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const selectTab = useCallback((id: DailyTabId) => {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  }, []);

  const section = sections.find(s => sectionTabId(s.id) === tab);

  if (tabs.length === 0) {
    return <EmptyState>Nothing placed on the daily page yet. Add tabs in Settings → Layout.</EmptyState>;
  }

  return (
    <div>
      {tab && <TabBar label="Daily page sections" tabs={tabs} active={tab} onChange={selectTab} />}
      {section && section.cards.length === 0 && (
        <EmptyState>Nothing placed here yet. Add cards in Settings → Layout.</EmptyState>
      )}
      {section?.cards.map(card => (
        <LayoutCard key={card.id} card={card} moduleData={moduleData} refs={reference} pageActions={actions} />
      ))}
    </div>
  );
}
