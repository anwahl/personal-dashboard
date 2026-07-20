'use client';

/**
 * ChartPanel — wraps any chart with per-chart date range controls.
 *
 * - Range buttons live inside the panel, not on the page
 * - Initial data comes from the server (fast first render)
 * - Range changes trigger client-side refetch via getCombinedTrackingData
 * - Opacity dims during loading so the chart doesn't disappear
 * - Default range varies by chart type (chain → 21d, others → 90d)
 */

import { useState, useCallback }     from 'react';
import { createClient }              from '@/lib/supabase/client';
import { getCombinedTrackingData }   from '@/lib/dal/analytics';
import { ScatterChart }              from './charts/ScatterChart';
import { LineTrendChart }            from './charts/LineTrendChart';
import { BarChart }                  from './charts/BarChart';
import { TimelineScatterChart }      from './charts/TimelineScatterChart';
import { ChainChart }                from './charts/ChainChart';
import { HabitHeatmap }              from './charts/HabitHeatmap';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';
import type { ChartType, TrackType } from '@/types/schema';

// ── Range presets ─────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: '7d',   value: 7   },
  { label: '21d',  value: 21  },
  { label: '30d',  value: 30  },
  { label: '90d',  value: 90  },
  { label: '180d', value: 180 },
  { label: '1yr',  value: 365 },
] as const;

const DEFAULT_RANGE: Record<ChartType, number> = {
  chain:    21,
  heatmap:  30,
  bar:      30,
  scatter:  90,
  line:     90,
  timeline: 90,
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateFromDays(days: number): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    toDate:   to.toISOString().slice(0, 10),
    fromDate: from.toISOString().slice(0, 10),
  };
}

// ── Inner chart renderer (pure presentation) ──────────────────────────────────

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
    case 'chain':    return <ChainChart chart={chart} data={data} fromDate={fromDate} toDate={toDate} />;
    default:         return null;
  }
}

// ── ChartPanel ────────────────────────────────────────────────────────────────

interface Props {
  chart:       ChartDefinitionDetail;
  initialData: TrackingDataPoint[];
  fromDate:    string;
  toDate:      string;
}

export function ChartPanel({ chart, initialData, fromDate, toDate }: Props) {
  const supabase = createClient();

  const defaultRange = DEFAULT_RANGE[chart.chart_type] ?? 90;

  const [data,    setData]    = useState<TrackingDataPoint[]>(initialData);
  const [from,    setFrom]    = useState(fromDate);
  const [to,      setTo]      = useState(toDate);
  const [range,   setRange]   = useState(defaultRange);
  const [loading, setLoading] = useState(false);

  const changeRange = useCallback(async (days: number) => {
    if (days === range && !loading) return;
    setRange(days);
    setLoading(true);
    try {
      const { fromDate: newFrom, toDate: newTo } = toDateFromDays(days);
      setFrom(newFrom);
      setTo(newTo);

      const allIds     = chart.links.map(l => l.trackable_id);
      const booleanIds = chart.links
        .filter(l => (l.trackable.track_type as TrackType) === 'boolean')
        .map(l => l.trackable_id);

      const newData = await getCombinedTrackingData(supabase, allIds, booleanIds, newFrom, newTo);
      setData(newData);
    } finally {
      setLoading(false);
    }
  }, [supabase, chart, range, loading]);

  return (
    <div className="chart-panel">
      {/* Per-chart range controls */}
      <div className="chart-panel__controls">
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`chart-range-btn${range === opt.value ? ' chart-range-btn--active' : ''}`}
            onClick={() => changeRange(opt.value)}
            disabled={loading}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart (dimmed while loading new range data) */}
      <div style={{ opacity: loading ? 0.45 : 1, transition: 'opacity 0.15s' }}>
        <ChartRenderer chart={chart} data={data} fromDate={from} toDate={to} />
      </div>
    </div>
  );
}
