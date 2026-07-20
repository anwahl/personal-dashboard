'use client';

/**
 * BarChart
 *
 * Date on X axis, bars for each metric value on Y axis.
 * Multiple series = grouped side-by-side bars.
 * Distinct from timeline scatter (dots) and line (connected).
 */

import { useState } from 'react';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';

interface Props {
  chart: ChartDefinitionDetail;
  data:  TrackingDataPoint[];
}

const TICK_MAX = 10;
const Y_TICKS  = [0, 2, 4, 6, 8, 10];

export function BarChart({ chart, data }: Props) {
  const seriesLinks = chart.links.filter(l => l.metric_role === 'series');
  const [hovered, setHovered] = useState<{ date: string; trackableId: number; value: number } | null>(null);

  if (!seriesLinks.length) {
    return (
      <div className="chart-block">
        <h3 className="chart-block__title">{chart.title}</h3>
        <p className="empty-state">No series configured. Add metrics in Settings → Charts.</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="chart-block">
        <h3 className="chart-block__title">{chart.title}</h3>
        <p className="empty-state">No data in this range.</p>
      </div>
    );
  }

  const PAD      = { top: 20, right: 16, bottom: 36, left: 36 };
  const BAR_W    = 8;
  const BAR_GAP  = 2;
  const GROUP_W  = seriesLinks.length * BAR_W + (seriesLinks.length - 1) * BAR_GAP + 6;
  const CHART_H  = 220;
  const INNER_H  = CHART_H - PAD.top - PAD.bottom;
  const SVG_W    = PAD.left + data.length * GROUP_W + PAD.right;

  const toY     = (v: number) => PAD.top + INNER_H - (v / TICK_MAX) * INNER_H;
  const barH    = (v: number) => (v / TICK_MAX) * INNER_H;
  const groupX  = (i: number) => PAD.left + i * GROUP_W + GROUP_W / 2;

  // Date labels: show roughly every nth label so they don't overlap
  const labelStep = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{chart.title}</h3>
      <div className="chart-scroll">
        <svg width={SVG_W} height={CHART_H} className="chart-svg">

          {/* Y grid + tick labels */}
          {Y_TICKS.map(t => (
            <g key={t}>
              <line
                x1={PAD.left} y1={toY(t)} x2={SVG_W - PAD.right} y2={toY(t)}
                stroke="var(--border)" strokeWidth={0.5}
              />
              <text x={PAD.left - 4} y={toY(t) + 4} className="chart-tick" textAnchor="end">{t}</text>
            </g>
          ))}

          {/* Bars */}
          {data.map((dp, i) => {
            const gx = groupX(i);
            return (
              <g key={dp.date}>
                {seriesLinks.map((link, si) => {
                  const v = dp.values[link.trackable_id];
                  if (v == null) return null;
                  const color  = link.trackable.color_hex ?? 'var(--accent)';
                  const bx     = gx - (seriesLinks.length * (BAR_W + BAR_GAP)) / 2 + si * (BAR_W + BAR_GAP);
                  const isHov  = hovered?.date === dp.date && hovered?.trackableId === link.trackable_id;
                  return (
                    <rect
                      key={link.trackable_id}
                      x={bx} y={toY(v)} width={BAR_W} height={barH(v)}
                      fill={color} fillOpacity={isHov ? 1 : 0.75} rx={1}
                      onMouseEnter={() => setHovered({ date: dp.date, trackableId: link.trackable_id, value: v })}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'default' }}
                    />
                  );
                })}
                {/* Date label */}
                {i % labelStep === 0 && (
                  <text x={gx} y={CHART_H - 4} className="chart-tick" textAnchor="middle">
                    {dp.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Tooltip */}
          {hovered && (() => {
            const idx  = data.findIndex(dp => dp.date === hovered.date);
            const gx   = groupX(idx);
            const link = seriesLinks.find(l => l.trackable_id === hovered.trackableId);
            return (
              <g>
                <rect x={gx + 6} y={toY(hovered.value) - 28} width={148} height={22}
                  rx={4} fill="var(--surface-high)" stroke="var(--border)" />
                <text x={gx + 12} y={toY(hovered.value) - 12}
                  style={{ fontSize: 10, fill: 'var(--text)' }}>
                  {hovered.date} · {link?.trackable.name}: {hovered.value}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="chart-info-bar">
        <div className="chart-legend">
          {seriesLinks.map(link => (
            <span key={link.trackable_id} className="chart-legend__item">
              <span className="chart-legend__swatch"
                style={{ background: link.trackable.color_hex ?? 'var(--accent)', height: 10, borderRadius: 2 }} />
              {link.trackable.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
