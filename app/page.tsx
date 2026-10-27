import Link                                     from 'next/link';
import { createClient }                         from '@/lib/supabase/server';
import { getRecentIntention }                   from '@/lib/dal/daily';
import { localTodayISO }                        from "@/lib/utils/dates";
import { getSections, modulesIn, hasCategories } from '@/lib/dal/placement';
import { getModuleData }                        from '@/lib/dal/modules';
import { HubClock }                             from '@/components/hub/HubClock';
import { HomeSections }                         from '@/components/sections/HomeSections';
import { EmptyState }                           from '@/components/ui';
import { PageBody } from '@/components/layout';

export default async function HubPage() {
  const today    = localTodayISO();
  const supabase = await createClient();

  // The clock, Today and the intention are fixed; everything below them is
  // the HOME sections from Settings → Layout.
  const [sections, intention] = await Promise.all([
    getSections(supabase, 'HOME'),
    getRecentIntention(supabase, today),
  ]);
  const moduleData = await getModuleData(supabase, modulesIn(sections), today, hasCategories(sections));

  return (
    <PageBody>

      {/* ── Top bar ── */}
      <div className="hub-top">
        <HubClock />
        <Link href={`/daily/${today}`} className="hub-today-btn">
          Today →
        </Link>
      </div>

      {/* ── Intention ── */}
      {intention && (
        <p className="hub-intention">"{intention.value}"</p>
      )}

      {sections.length
        ? <HomeSections sections={sections} data={moduleData} />
        : <EmptyState>Nothing placed on Home yet. Add sections in Settings → Layout.</EmptyState>}
    </PageBody>
  );
}
