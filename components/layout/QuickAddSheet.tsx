'use client';

/**
 * QuickAddSheet — opened from the ＋ on the mobile tab bar.
 *
 *   QUICKADD sections — from Settings → Layout: each section a group, its
 *                       cards' components (quick task, brain dump, …)
 *   Log something     — fixed: shortcuts into today's daily tabs (QuickLog)
 *
 * The layout loads each time the sheet opens. Forms save on their own; the
 * sheet then toasts and closes.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardSection, CardSectionLabel, Dialog, EmptyState, useToast } from '@/components/ui';
import { LayoutCard }       from '@/components/sections/LayoutCard';
import { QuickLog }         from '@/components/sections/QuickLog';
import { TodayProvider }    from '@/components/sections/DayContext';
import { createClient }     from '@/lib/supabase/client';
import { getSections, modulesIn, hasCategories } from '@/lib/dal/placement';
import { getModuleData, type ModuleData } from '@/lib/dal/modules';
import { useLocalToday }    from '@/lib/hooks/useLocalToday';
import type { SectionDetail } from '@/types/dal';

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

interface Loaded {
  quickAdd:   SectionDetail[];
  daily:      SectionDetail[];
  moduleData: ModuleData;
}

export function QuickAddSheet({ open, onOpenChange }: Readonly<Props>) {
  const router       = useRouter();
  const today        = useLocalToday();
  const { addToast } = useToast();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // Load the layout each time the sheet opens (it may have changed in Settings).
  useEffect(() => {
    if (!open || !today) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [quickAdd, daily] = await Promise.all([
        getSections(supabase, 'QUICKADD'),
        getSections(supabase, 'DAILY'),
      ]);
      const moduleData = await getModuleData(supabase, modulesIn(quickAdd), today, hasCategories(quickAdd));
      if (!cancelled) setLoaded({ quickAdd, daily, moduleData });
    })().catch(err => console.error('Quick add: loading the layout failed', err));
    return () => { cancelled = true; };
  }, [open, today]);

  const close = () => onOpenChange(false);

  /** After a form saves: toast (if there's a message), refresh, close. */
  const done = (message: string) => {
    if (message) addToast(message, 'success');
    router.refresh();
    close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Quick add" placement="bottom">
      {today && loaded && (
        <TodayProvider date={today}>
          {loaded.quickAdd.length === 0 && (
            <EmptyState>Nothing placed in Quick add yet. Add sections in Settings → Layout.</EmptyState>
          )}
          {loaded.quickAdd.map(section => (
            <CardSection key={section.id}>
              <CardSectionLabel>{section.name}</CardSectionLabel>
              {section.cards.map(card => (
                <LayoutCard key={card.id} card={card} moduleData={loaded.moduleData}
                  refs={loaded.moduleData.trackables} onDone={done} inSheet />
              ))}
            </CardSection>
          ))}

          <CardSection>
            <CardSectionLabel>Log something</CardSectionLabel>
            <QuickLog date={today} sections={loaded.daily} onNavigate={close} />
          </CardSection>
        </TodayProvider>
      )}
    </Dialog>
  );
}
