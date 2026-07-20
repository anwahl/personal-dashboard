'use client';

/**
 * HabitHeatmap
 *
 * Grid heatmap for boolean trackables.
 * One row per trackable, one column per day.
 * Configured via chart_trackable_links (metric_role = 'series').
 */

import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  chart:    ChartDefinitionDetail;
  data:     TrackingDataPoint[];
  fromDate: string;
  toDate:   string;
}

export function HabitHeatmap({ chart, data, fromDate, toDate }: Props) {
  const seriesLinks = chart.links.filter(l => l.metric_role === 'series');

  if (!seriesLinks.length) {
    return (
      <div className="chart-block">
        <h3 className="chart-block__title">{chart.title}</h3>
        <p className="empty-state">No habits configured for this heatmap. Add them in Settings → Charts.</p>
      </div>
    );
  }

  // Build index: date → values
  const byDate = new Map(data.map(dp => [dp.date, dp.values]));

  // Build sorted date list for column headers
  const dates: string[] = [];
  const cursor = new Date(fromDate + 'T12:00:00');
  const end    = new Date(toDate   + 'T12:00:00');
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Show at most ~90 days (scroll horizontally for more)
  const CELL = 14;
  const ROW_H = 22;
  const LABEL_W = 90;
  const svgW = LABEL_W + dates.length * CELL;
  const svgH = ROW_H * seriesLinks.length + 24;

  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{chart.title}</h3>
      <div className="chart-scroll">
        <svg width={svgW} height={svgH} className="chart-svg">
          {/* Month labels on the top axis */}
          {dates.map((date, i) => {
            if (date.endsWith('-01') || i === 0) {
              return (
                <text key={date}
                  x={LABEL_W + i * CELL + 2}
                  y={12}
                  className="chart-tick" style={{ fontSize: 9 }}>
                  {date.slice(0, 7)}
                </text>
              );
            }
            return null;
          })}

          {/* One row per habit */}
          {seriesLinks.map((link, rowIdx) => {
            const id    = link.trackable_id;
            const color = link.trackable.color_hex ?? 'var(--accent)';
            const y     = 18 + rowIdx * ROW_H;

            return (
              <g key={id}>
                {/* Row label */}
                <text x={0} y={y + ROW_H / 2 + 4} className="chart-tick" textAnchor="start">
                  {link.trackable.emoji ?? ''} {link.trackable.name}
                </text>
                {/* Cells */}
                {dates.map((date, colIdx) => {
                  const done = (byDate.get(date)?.[id] ?? 0) >= 1;
                  return (
                    <rect key={date}
                      x={LABEL_W + colIdx * CELL + 1}
                      y={y + 1}
                      width={CELL - 2}
                      height={ROW_H - 4}
                      rx={2}
                      fill={done ? color : 'var(--surface)'}
                      stroke="var(--border)"
                      strokeWidth={0.5}
                    >
                      <title>{date} · {link.trackable.name}: {done ? 'done' : 'not done'}</title>
                    </rect>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
