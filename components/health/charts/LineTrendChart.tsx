'use client';

/**
 * LineTrendChart
 *
 * Generic multi-series line chart for numeric/aggregate trackables.
 * Series are defined by chart_trackable_links with metric_role = 'series'.
 * Colors from trackable.color_hex (inline — dynamic).
 */

import { useState } from 'react';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  chart: ChartDefinitionDetail;
  data:  TrackingDataPoint[];
}

export function LineTrendChart({ chart, data }: Props) {
  const seriesLinks = chart.links.filter(l => l.metric_role === 'series');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  if (!seriesLinks.length) {
    return (
      <div className="chart-block">
        <h3 className="chart-block__title">{chart.title}</h3>
        <p className="empty-state">No series configured. Add metrics in Settings → Charts.</p>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="chart-block">
        <h3 className="chart-block__title">{chart.title}</h3>
        <p className="empty-state">Not enough data to draw a trend line.</p>
      </div>
    );
  }

  const W = 600, H = 240, PAD = { top: 20, right: 16, bottom: 36, left: 36 };
  const INNER_W = W - PAD.left - PAD.right;
  const INNER_H = H - PAD.top  - PAD.bottom;

  const TICK_MAX = 10;
  const yTicks   = [0, 2, 4, 6, 8, 10];

  // x axis: map date strings to pixel positions
  const toX = (date: string) => {
    const idx = data.findIndex(dp => dp.date === date);
    if (idx === -1) return null;
    return PAD.left + (idx / Math.max(data.length - 1, 1)) * INNER_W;
  };
  const toY = (v: number) =>
    PAD.top + INNER_H - (v / TICK_MAX) * INNER_H;

  // x-axis date labels (≤8 evenly spaced)
  const dateLabels: string[] = [];
  const labelStep = Math.ceil(data.length / 8);
  data.forEach((dp, i) => { if (i % labelStep === 0) dateLabels.push(dp.date); });

  // Which data point is being hovered
  const hoveredPoint = hoveredDate ? data.find(dp => dp.date === hoveredDate) : null;

  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{chart.title}</h3>

      <div className="chart-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg"
          onMouseLeave={() => setHoveredDate(null)}>

          {/* Y grid lines + tick labels */}
          {yTicks.map(t => (
            <g key={t}>
              <line
                x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)}
                stroke="var(--border)" strokeWidth={0.5}
              />
              <text x={PAD.left - 4} y={toY(t) + 4} className="chart-tick" textAnchor="end">{t}</text>
            </g>
          ))}

          {/* X axis date labels */}
          {dateLabels.map(date => {
            const x = toX(date);
            if (x == null) return null;
            return (
              <text key={date} x={x} y={H - 4} className="chart-tick" textAnchor="middle">
                {date.slice(5)}
              </text>
            );
          })}

          {/* One polyline per series */}
          {seriesLinks.map(link => {
            const id    = link.trackable_id;
            const color = link.trackable.color_hex ?? 'var(--accent)';

            const pts = data
              .filter(dp => dp.values[id] != null)
              .map(dp => ({ date: dp.date, v: dp.values[id] }));

            if (pts.length < 2) return null;

            const pathD = pts
              .map((pt, i) => {
                const x = toX(pt.date);
                if (x == null) return '';
                const y = toY(pt.v);
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              })
              .filter(Boolean)
              .join(' ');

            return (
              <g key={id}>
                <path d={pathD} stroke={color} strokeWidth={2} fill="none" />
                {/* Dots */}
                {pts.map(pt => {
                  const x = toX(pt.date);
                  if (x == null) return null;
                  return (
                    <circle key={pt.date} cx={x} cy={toY(pt.v)} r={3}
                      fill={color} stroke="var(--bg)" strokeWidth={1}
                      onMouseEnter={() => setHoveredDate(pt.date)}
                      style={{ cursor: 'crosshair' }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Hover line + values */}
          {hoveredDate && (function() {
            const hx = toX(hoveredDate);
            if (hx == null) return null;
            return (
              <g>
                <line x1={hx} y1={PAD.top} x2={hx} y2={H - PAD.bottom}
                  stroke="var(--text-faint)" strokeWidth={1} />
                {seriesLinks.map(link => {
                  if (!hoveredPoint?.values[link.trackable_id]) return null;
                  const v = hoveredPoint.values[link.trackable_id];
                  const color = link.trackable.color_hex ?? 'var(--accent)';
                  return (
                    <text key={link.trackable_id} x={hx + 6}
                      y={toY(v) - 4} style={{ fontSize: 10, fill: color }}>
                      {link.trackable.name}: {v}
                    </text>
                  );
                })}
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="chart-info-bar">
        <div className="chart-legend">
          {seriesLinks.map(link => (
            <span key={link.trackable_id} className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ background: link.trackable.color_hex ?? 'var(--accent)' }} />
              {link.trackable.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
