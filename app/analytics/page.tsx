import { createClient }            from '@/lib/supabase/server';
import { getChartDefinitions, getIconsRef } from '@/lib/dal/reference';
import { getCombinedTrackingData } from '@/lib/dal/analytics';
import { AnalyticsClient }         from '@/components/analytics/AnalyticsClient';
import type { TrackType }          from '@/types/schema';

export default async function AnalyticsPage() {
  // Initial server render at 90 days — each chart can change its own range client-side
  const DEFAULT_DAYS = 90;
  const toDate   = new Date().toISOString().slice(0, 10);
  const fromDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS);
    return d.toISOString().slice(0, 10);
  })();

  const supabase = await createClient();
  const [charts, icons] = await Promise.all([
    getChartDefinitions(supabase),
    getIconsRef(supabase),
  ]);

  const allIds     = new Set<number>();
  const booleanIds = new Set<number>();
  for (const chart of charts) {
    for (const link of chart.links) {
      allIds.add(link.trackable_id);
      if ((link.trackable.track_type as TrackType) === 'boolean') {
        booleanIds.add(link.trackable_id);
      }
    }
  }

  const data = await getCombinedTrackingData(
    supabase,
    [...allIds],
    [...booleanIds],
    fromDate,
    toDate
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">📈 Analytics</h1>
      </div>
      <AnalyticsClient
        charts={charts}
        data={data}
        fromDate={fromDate}
        toDate={toDate}
        icons={icons}
      />
    </div>
  );
}
