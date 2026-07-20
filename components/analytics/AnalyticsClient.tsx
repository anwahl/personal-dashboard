'use client';

/**
 * AnalyticsClient
 *
 * Tabbed analytics page. Each tab = one chart category.
 * An "All" tab always shows everything.
 * Chart data is a single merged TrackingDataPoint[] covering all trackable types.
 */

import { useState }              from 'react';
import { useRouter }             from 'next/navigation';
import { Button }                from '@/components/ui/Button';
import { TabBar }                from '@/components/ui/Controls';
import { ScatterChart }          from './charts/ScatterChart';
import { LineTrendChart }        from './charts/LineTrendChart';
import { BarChart }              from './charts/BarChart';
import { TimelineScatterChart }  from './charts/TimelineScatterChart';
import { HabitHeatmap }          from './charts/HabitHeatmap';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  charts:    ChartDefinitionDetail[];
  data:      TrackingDataPoint[];
  fromDate:  string;
  toDate:    string;
  rangeDays: number;
}

const RANGE_OPTIONS = [
  { label: '30d',  value: 30  },
  { label: '90d',  value: 90  },
  { label: '180d', value: 180 },
  { label: '1yr',  value: 365 },
];

function ChartRenderer({ chart, data, fromDate, toDate }: {
  chart:    ChartDefinitionDetail;
  data:     TrackingDataPoint[];
  fromDate: string;
  toDate:   string;
}) {
  switch (chart.chart_type) {
    case 'scatter':  return <ScatterChart chart={chart} data={data} />;
    case 'line':     return <LineTrendChart chart={chart} data={data} />;
    case 'bar':      return <BarChart chart={chart} data={data} />;
    case 'timeline': return <TimelineScatterChart chart={chart} data={data} />;
    case 'heatmap':  return <HabitHeatmap chart={chart} data={data} fromDate={fromDate} toDate={toDate} />;
    default:         return null;
  }
}

export function AnalyticsClient({ charts, data, fromDate, toDate, rangeDays }: Props) {
  const router = useRouter();

  // Build category tabs from charts — preserve category sort_order
  const categoryOrder = new Map<string, number>();
  categoryOrder.set('All', -1);
  for (const chart of charts) {
    const key = chart.category?.name ?? 'Uncategorised';
    if (!categoryOrder.has(key)) {
      categoryOrder.set(key, chart.category?.sort_order ?? 999);
    }
  }

  const tabs = [
    { id: 'All', label: 'All' },
    ...[...categoryOrder.entries()]
      .filter(([id]) => id !== 'All')
      .sort((a, b) => a[1] - b[1])
      .map(([name]) => ({ id: name, label: name })),
  ];

  const [activeTab, setActiveTab] = useState('All');

  const visibleCharts = activeTab === 'All'
    ? charts
    : charts.filter(c => (c.category?.name ?? 'Uncategorised') === activeTab);

  const setRange = (days: number) => router.push(`/analytics?range=${days}`);

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

      {/* Category tabs (only if more than one category exists) */}
      {tabs.length > 2 && (
        <div className="analytics-tabs">
          <TabBar
            tabs={tabs}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
      )}

      {visibleCharts.length === 0 && (
        <p className="empty-state">
          {charts.length === 0
            ? 'No charts configured. Add charts in Settings → Charts.'
            : `No charts in "${activeTab}".`}
        </p>
      )}

      {visibleCharts.map(chart => (
        <div key={chart.id} className="chart-block">
          <ChartRenderer chart={chart} data={data} fromDate={fromDate} toDate={toDate} />
        </div>
      ))}
    </div>
  );
}
