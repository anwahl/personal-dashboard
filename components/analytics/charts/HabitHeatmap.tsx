'use client';

/**
 * HabitHeatmap
 *
 * Grid heatmap for boolean trackables.
 * One row per trackable, one column per day.
 * Configured via chart_trackable_links (metric_role = 'series').
 */

import { ChartEmptyState } from './ChartEmptyState';
import { IconDisplay }      from '@/components/ui';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';
import type { IconRow } from '@/types/schema';

interface Props {
  chart:    ChartDefinitionDetail;
  data:     TrackingDataPoint[];
  fromDate: string;
  toDate:   string;
  icons:    IconRow[];
}

export function HabitHeatmap({ chart, data, fromDate, toDate, icons }: Readonly<Props>) {
  const seriesLinks = chart.links.filter(l => l.metric_role === 'series');

  if (!seriesLinks.length) {
    return <ChartEmptyState title={chart.title} message="No habits configured for this heatmap. Add them in Settings → Charts." />;
  }

  const byDate = new Map(data.map(dp => [dp.date, dp.values]));

  const dates: string[] = [];
  const cursor = new Date(fromDate + 'T12:00:00');
  const end    = new Date(toDate   + 'T12:00:00');
  while (cursor <= end) {
    const [hy, hm, hd] = [cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()];
    dates.push(`${hy}-${String(hm).padStart(2, '0')}-${String(hd).padStart(2, '0')}`);

    cursor.setDate(cursor.getDate() + 1);
  }

  const CELL    = 14;
  const ROW_H   = 22;
  const LABEL_W = 90;
  const svgW    = LABEL_W + dates.length * CELL;
  const svgH    = ROW_H * seriesLinks.length + 24;

  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{chart.title}</h3>
      <div className="chart-scroll">
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>

          {/* Month labels on top axis */}
          {dates.map((date, i) => {
            if (!date.endsWith('-01') && i !== 0) return null;
            return (
              <text key={date}
                x={LABEL_W + i * CELL + 2}
                y={12}
                className="chart-tick--month">
                {date.slice(0, 7)}
              </text>
            );
          })}

          {/* One row per habit */}
          {seriesLinks.map((link, rowIdx) => {
            const id    = link.trackable_id;
            const color = link.trackable.color_hex ?? 'var(--accent)';
            const y     = 18 + rowIdx * ROW_H;

            return (
              <g key={id}>
                <foreignObject x={0} y={y + ROW_H / 2 - 9} width={18} height={18}>
                  <IconDisplay
                    icon={icons.find(i => i.id === link.trackable.icon_id) ?? null}
                    size="sm"
                  />
                </foreignObject>
                <text x={20} y={y + ROW_H / 2 + 4} className="chart-tick" textAnchor="start">
                  {link.trackable.name}
                </text>
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
                      strokeWidth={0.5}>
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
