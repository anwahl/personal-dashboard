'use client';

/**
 * AnalyticsClient
 *
 * Tabbed by chart category. Each chart renders inside a ChartPanel
 * which owns its own date range state and client-side data fetching.
 * No global range selector — each chart is independent.
 */

import { useState }         from 'react';
import { TabBar }           from '@/components/ui/Controls';
import { ChartPanel }       from './ChartPanel';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  charts:      ChartDefinitionDetail[];
  data:        TrackingDataPoint[];   // initial server-fetched data (default range)
  fromDate:    string;
  toDate:      string;
}

export function AnalyticsClient({ charts, data, fromDate, toDate }: Props) {
  // Build category tabs from charts
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

  return (
    <div>
      {/* Category tabs (only when more than one category) */}
      {tabs.length > 2 && (
        <div className="analytics-tabs">
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
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
        <ChartPanel
          key={chart.id}
          chart={chart}
          initialData={data}
          fromDate={fromDate}
          toDate={toDate}
        />
      ))}
    </div>
  );
}
