'use client';

/**
 * ScatterChart
 *
 * Generic scatter chart. Reads x_axis / y_axis roles from chart_trackable_links.
 * Computes Pearson r and draws a regression line.
 * Colors from trackable.color_hex (inline — dynamic values, per standards).
 */

import { useState }          from 'react';
import { ChartEmptyState }   from './ChartEmptyState';
import { ChartLegend }       from './ChartLegend';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  chart: ChartDefinitionDetail;
  data:  TrackingDataPoint[];
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const n    = xs.length;
  const xBar = xs.reduce((s, x) => s + x, 0) / n;
  const yBar = ys.reduce((s, y) => s + y, 0) / n;
  const num  = xs.reduce((s, x, i) => s + (x - xBar) * (ys[i] - yBar), 0);
  const den  = Math.sqrt(
    xs.reduce((s, x) => s + (x - xBar) ** 2, 0) *
    ys.reduce((s, y) => s + (y - yBar) ** 2, 0)
  );
  return den === 0 ? null : num / den;
}

export function ScatterChart({ chart, data }: Props) {
  const xLink = chart.links.find(l => l.metric_role === 'x_axis');
  const yLink = chart.links.find(l => l.metric_role === 'y_axis');
  const [hovered, setHovered] = useState<{ date: string; x: number; y: number } | null>(null);

  if (!xLink || !yLink) {
    return <ChartEmptyState title={chart.title} message="Chart needs an x_axis and y_axis metric. Configure in Settings → Charts." />;
  }

  const xId    = xLink.trackable_id;
  const yId    = yLink.trackable_id;
  const xColor = xLink.trackable.color_hex ?? 'var(--accent)';
  const yColor = yLink.trackable.color_hex ?? 'var(--text-muted)';

  const points: { date: string; x: number; y: number }[] = [];
  for (const dp of data) {
    if (dp.values[xId] != null && dp.values[yId] != null) {
      points.push({ date: dp.date, x: dp.values[xId], y: dp.values[yId] });
    }
  }

  if (points.length < 2) {
    return <ChartEmptyState title={chart.title} message="Not enough paired data to display scatter chart." />;
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const r  = pearson(xs, ys);

  const W = 500, H = 320, PAD = 40, TICK_MAX = 10;
  const toSvgX = (v: number) => PAD + (v / TICK_MAX) * (W - PAD * 2);
  const toSvgY = (v: number) => H - PAD - (v / TICK_MAX) * (H - PAD * 2);

  let lineEl: React.ReactNode = null;
  if (r != null) {
    const xBar      = xs.reduce((s, x) => s + x, 0) / xs.length;
    const yBar      = ys.reduce((s, y) => s + y, 0) / ys.length;
    const slope     = xs.reduce((s, x, i) => s + (x - xBar) * (ys[i] - yBar), 0) /
                      xs.reduce((s, x) => s + (x - xBar) ** 2, 0);
    const intercept = yBar - slope * xBar;
    lineEl = (
      <line
        x1={toSvgX(0)} y1={toSvgY(intercept)}
        x2={toSvgX(TICK_MAX)} y2={toSvgY(slope * TICK_MAX + intercept)}
        stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="4,3"
      />
    );
  }

  const ticks = [0, 2, 4, 6, 8, 10];

  const legendItems = [
    { id: xId, name: xLink.trackable.name, color: xColor, suffix: '(x)' },
    { id: yId, name: yLink.trackable.name, color: yColor, suffix: '(y)' },
  ];

  const pearsonPrefix = r != null ? (
    <>
      <span>n = {points.length}</span>
      <span>
        r = <strong>{r.toFixed(2)}</strong>
        {Math.abs(r) >= 0.5 ? (r > 0 ? ' ↑ positive' : ' ↓ negative') : ' weak'}
      </span>
    </>
  ) : <span>n = {points.length}</span>;

  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{chart.title}</h3>
      <div className="chart-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
          {/* Grid lines */}
          {ticks.map(t => (
            <g key={t}>
              <line x1={toSvgX(0)} y1={toSvgY(t)} x2={toSvgX(TICK_MAX)} y2={toSvgY(t)}
                stroke="var(--border)" strokeWidth={0.5} />
              <line x1={toSvgX(t)} y1={toSvgY(0)} x2={toSvgX(t)} y2={toSvgY(TICK_MAX)}
                stroke="var(--border)" strokeWidth={0.5} />
              <text x={toSvgX(0) - 6} y={toSvgY(t) + 4} className="chart-tick" textAnchor="end">{t}</text>
              <text x={toSvgX(t)} y={toSvgY(0) + 14} className="chart-tick" textAnchor="middle">{t}</text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={(W - PAD) / 2 + PAD / 2} y={H - 4} className="chart-axis-label" textAnchor="middle">
            {xLink.trackable.name}
          </text>
          <text x={12} y={(H - PAD) / 2 + PAD / 2} className="chart-axis-label" textAnchor="middle"
            transform={`rotate(-90, 12, ${(H - PAD) / 2 + PAD / 2})`}>
            {yLink.trackable.name}
          </text>

          {lineEl}

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={4}
              fill={yColor} fillOpacity={0.8}
              className="chart-dot--pointer"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* Hover tooltip */}
          {hovered && (
            <g>
              <rect
                x={toSvgX(hovered.x) + 8} y={toSvgY(hovered.y) - 28}
                width={120} height={26} rx={4}
                fill="var(--surface-high)" stroke="var(--border)"
              />
              <text x={toSvgX(hovered.x) + 14} y={toSvgY(hovered.y) - 12}
                className="chart-tooltip-text">
                {hovered.date} · {xLink.trackable.name}: {hovered.x} / {yLink.trackable.name}: {hovered.y}
              </text>
            </g>
          )}
        </svg>
      </div>

      <ChartLegend items={legendItems} prefix={pearsonPrefix} />
    </div>
  );
}
