import { createClient }           from '@/lib/supabase/server';
import { getChartDefinitions }    from '@/lib/dal/reference';
import { getCombinedTrackingData } from '@/lib/dal/analytics';
import { AnalyticsClient }        from '@/components/analytics/AnalyticsClient';
import type { TrackType }         from '@/types/schema';

interface Props {
  searchParams: Promise<{ range?: string; category?: string }>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { range = '90' } = await searchParams;
  const days     = Math.min(365, Math.max(7, parseInt(range) || 90));
  const toDate   = new Date().toISOString().slice(0, 10);
  const fromDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  })();

  const supabase = await createClient();
  const charts   = await getChartDefinitions(supabase);

  // Collect all trackable IDs and which ones are boolean
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

  // Single unified dataset — boolean trackables appear as value=1
  const data = await getCombinedTrackingData(
    supabase,
    [...allIds],
    [...booleanIds],
    fromDate,
    toDate
  );

  // Collect unique categories from active charts
  const categoryMap = new Map<number | null, string>();
  categoryMap.set(null, 'Uncategorised');
  for (const chart of charts) {
    if (chart.category) {
      categoryMap.set(chart.category.id, chart.category.name);
    }
  }

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
        rangeDays={days}
      />
    </div>
  );
}
