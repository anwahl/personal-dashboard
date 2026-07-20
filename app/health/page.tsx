import { createClient }        from '@/lib/supabase/server';
import { getChartDefinitions } from '@/lib/dal/reference';
import { getTrackingData, getBooleanData } from '@/lib/dal/analytics';
import { HealthAnalyticsClient } from '@/components/health/HealthAnalyticsClient';
import type { TrackingDataPoint } from '@/types/dal';

interface Props {
  searchParams: Promise<{ range?: string }>;
}

export default async function HealthPage({ searchParams }: Props) {
  const { range = '90' }  = await searchParams;
  const days = Math.min(365, Math.max(7, parseInt(range) || 90));

  const toDate   = new Date().toISOString().slice(0, 10);
  const fromDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  })();

  const supabase = await createClient();
  const charts   = await getChartDefinitions(supabase);

  // Collect which trackable IDs are needed for numeric vs boolean charts
  const numericIds = new Set<number>();
  const booleanIds = new Set<number>();

  for (const chart of charts) {
    for (const link of chart.links) {
      if (link.trackable.track_type === 'boolean') {
        booleanIds.add(link.trackable_id);
      } else {
        numericIds.add(link.trackable_id);
      }
    }
  }

  // Fetch data for all trackables in one pass per type
  const [numericData, booleanData] = await Promise.all([
    numericIds.size > 0
      ? getTrackingData(supabase, [...numericIds], fromDate, toDate)
      : Promise.resolve<TrackingDataPoint[]>([]),
    booleanIds.size > 0
      ? getBooleanData(supabase, [...booleanIds], fromDate, toDate)
      : Promise.resolve<TrackingDataPoint[]>([]),
  ]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">📈 Health Analytics</h1>
      </div>

      <HealthAnalyticsClient
        charts={charts}
        numericData={numericData}
        booleanData={booleanData}
        fromDate={fromDate}
        toDate={toDate}
        rangeDays={days}
      />
    </div>
  );
}
