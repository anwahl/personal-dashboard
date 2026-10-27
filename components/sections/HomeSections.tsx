'use client';

/**
 * HomeSections — the HOME sections on the Hub: each section is a row
 * (hub-grid), each card a column, drawn as a card (LayoutCard).
 */

import { LayoutCard } from './LayoutCard';
import { TodayProvider } from './DayContext';
import type { SectionDetail } from '@/types/dal';
import type { ModuleData } from '@/lib/dal/modules';

export function HomeSections({ sections, data }: Readonly<{ sections: SectionDetail[]; data: ModuleData }>) {
  return (
    <TodayProvider date={data.date}>
      {sections.map(section => (
        <div key={section.id} className="hub-grid">
          {section.cards.map(card => (
            <LayoutCard key={card.id} card={card} moduleData={data} refs={data.trackables} />
          ))}
        </div>
      ))}
    </TodayProvider>
  );
}
