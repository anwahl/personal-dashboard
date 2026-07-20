'use client';

/**
 * HealthAnalyticsClient
 *
 * Renders one chart per ChartDefinitionDetail.
 * All configuration comes from the DB — no hardcoded chart names or types.
 */

import { useRouter }     from 'next/navigation';
import { Button }        from '@/components/ui/Button';
import { ScatterChart }  from './charts/ScatterChart';
import { LineTrendChart } from './charts/LineTrendChart';
import { HabitHeatmap }         from './HabitHeatmap';
import { TimelineScatterChart } from './charts/TimelineScatterChart';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  charts:      ChartDefinitionDetail[];
  numericData: TrackingDataPoint[];
  booleanData: TrackingDataPoint[];
  fromDate:    string;
  toDate:      string;
  rangeDays:   number;
}

const RANGE_OPTIONS = [
  { label: '30d',  value: 30  },
  { label: '90d',  value: 90  },
  { label: '180d', value: 180 },
  { label: '1yr',  value: 365 },
];

export function HealthAnalyticsClient({
  charts, numericData, booleanData, fromDate, toDate, rangeDays,
}: Props) {
  const router = useRouter();

  const setRange = (days: number) =>
    router.push(`/health?range=${days}`);

  return (
    <div>
      {/* Range selector */}
      <div className="chart-controls">
        {RANGE_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={rangeDays === opt.value ? 'accent' : 'ghost'}
            size="sm"
            onClick={() => setRange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {charts.length === 0 && (
        <p className="empty-state">No charts configured. Add charts in Settings → Charts.</p>
      )}

      {/* One block per chart definition */}
      {charts.map(chart => (
        <div key={chart.id} className="chart-block">
          {chart.chart_type === 'scatter' && (
            <ScatterChart chart={chart} data={numericData} />
          )}
          {chart.chart_type === 'line' && (
            <LineTrendChart chart={chart} data={numericData} />
          )}
          {chart.chart_type === 'heatmap' && (
            <HabitHeatmap chart={chart} data={booleanData} fromDate={fromDate} toDate={toDate} />
          )}
          {chart.chart_type === 'timeline' && (
            <TimelineScatterChart chart={chart} data={numericData} />
          )}
        </div>
      ))}
    </div>
  );
}
