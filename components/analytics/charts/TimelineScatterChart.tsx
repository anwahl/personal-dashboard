'use client';

/**
 * TimelineScatterChart
 *
 * Date on X axis, metric value on Y axis, dots not connected.
 * Supports multiple series (one color per trackable).
 */

import { useState }          from 'react';
import { ChartEmptyState }   from './ChartEmptyState';
import { ChartLegend }       from './ChartLegend';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  chart: ChartDefinitionDetail;
  data:  TrackingDataPoint[];
}

export function TimelineScatterChart({ chart, data }: Readonly<Props>) {
  const seriesLinks = chart.links.filter(l => l.metric_role === 'series');
  const [hovered, setHovered] = useState<{ date: string; trackableId: number; value: number } | null>(null);

  if (!seriesLinks.length) {
    return <ChartEmptyState title={chart.title} message="No series configured. Add metrics in Settings → Charts." />;
  }
  if (data.length < 2) {
    return <ChartEmptyState title={chart.title} message="Not enough data to display." />;
  }

  const W = 600, H = 240;
  const PAD = { top: 20, right: 16, bottom: 36, left: 36 };
  const INNER_W = W - PAD.left - PAD.right;
  const INNER_H = H - PAD.top  - PAD.bottom;
  const TICK_MAX = 10;
  const Y_TICKS  = [0, 2, 4, 6, 8, 10];

  const toX = (idx: number) => PAD.left + (idx / Math.max(data.length - 1, 1)) * INNER_W;
  const toY = (v: number)   => PAD.top  + INNER_H - (v / TICK_MAX) * INNER_H;

  const labelStep  = Math.ceil(data.length / 8);
  const dateLabels = data
    .map((dp, i) => ({ date: dp.date, x: toX(i), show: i % labelStep === 0 }))
    .filter(l => l.show);

  const legendItems = seriesLinks.map(l => ({
    id:    l.trackable_id,
    name:  l.trackable.name,
    color: l.trackable.color_hex,
  }));

  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{chart.title}</h3>

      <div className="chart-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg"
          onMouseLeave={() => setHovered(null)}>

          {/* Y grid + tick labels */}
          {Y_TICKS.map(t => (
            <g key={t}>
              <line
                x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)}
                stroke="var(--border)" strokeWidth={0.5}
              />
              <text x={PAD.left - 4} y={toY(t) + 4} className="chart-tick" textAnchor="end">{t}</text>
            </g>
          ))}

          {/* X axis date labels */}
          {dateLabels.map(l => (
            <text key={l.date} x={l.x} y={H - 4} className="chart-tick" textAnchor="middle">
              {l.date.slice(5)}
            </text>
          ))}

          {/* Dots per series */}
          {seriesLinks.map(link => {
            const id    = link.trackable_id;
            const color = link.trackable.color_hex ?? 'var(--accent)';
            return data.map((dp, i) => {
              const v = dp.values[id];
              if (v == null) return null;
              const x     = toX(i);
              const y     = toY(v);
              const isHov = hovered?.date === dp.date && hovered?.trackableId === id;
              return (
                <circle
                  key={`${id}-${dp.date}`}
                  cx={x} cy={y} r={isHov ? 6 : 4}
                  fill={color} fillOpacity={0.85}
                  stroke={isHov ? 'var(--bg)' : 'none'} strokeWidth={1.5}
                  onMouseEnter={() => setHovered({ date: dp.date, trackableId: id, value: v })}
                />
              );
            });
          })}

          {/* Hover tooltip */}
          {hovered && (() => {
            const idx  = data.findIndex(dp => dp.date === hovered.date);
            const x    = toX(idx);
            const y    = toY(hovered.value);
            const link = seriesLinks.find(l => l.trackable_id === hovered.trackableId);
            return (
              <g>
                <line x1={x} y1={PAD.top} x2={x} y2={H - PAD.bottom}
                  stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="3,2" />
                <rect x={x + 8} y={y - 28} width={150} height={22} rx={4}
                  fill="var(--surface-high)" stroke="var(--border)" />
                <text x={x + 14} y={y - 12}>
                  {hovered.date} · {link?.trackable.name}: {hovered.value}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      <ChartLegend items={legendItems} />
    </div>
  );
}
