import { createClient }            from '@/lib/supabase/server';
import { getChartDefinitions, getIconsRef } from '@/lib/dal/reference';
import { getCombinedTrackingData } from '@/lib/dal/analytics';
import { AnalyticsClient }         from '@/components/analytics/AnalyticsClient';
import { localTodayISO, localISODate } from "@/lib/utils/dates";
import { Header, PageBody } from '@/components/layout';

export default async function AnalyticsPage() {
  // Initial server render at 90 days — each chart can change its own range client-side
  const DEFAULT_DAYS = 90;
  const toDate   = localTodayISO();
  const fromDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS);
    return localISODate(d);
  })();

  const supabase = await createClient();
  const [charts, icons] = await Promise.all([
    getChartDefinitions(supabase),
    getIconsRef(supabase),
  ]);

  // Every trackable on any chart, once.
  const trackables = [...new Map(
    charts.flatMap(chart => chart.links.map(l => [l.trackable_id, l.trackable] as const)),
  ).values()];

  const data = await getCombinedTrackingData(supabase, trackables, fromDate, toDate);

  return (
    <PageBody>
      <Header title='📈 Analytics'/>
      <AnalyticsClient
        charts={charts}
        data={data}
        fromDate={fromDate}
        toDate={toDate}
        icons={icons}
      />
    </PageBody>
  );
}
