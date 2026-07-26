'use client';

/**
 * ChainChart — streak visualization for boolean trackables.
 *
 * One row per series, one column per day in range.
 * Circles: filled (done) | outlined (missed) | faded (no entry) | ghost (future)
 * Lines between circles: bright when both days done, dim otherwise.
 * Streak count shown at right edge with 🔥 if active.
 * Today gets an accent ring.
 */

import { ChartEmptyState } from './ChartEmptyState';
import type { ChartDefinitionDetail, TrackingDataPoint } from '@/types/dal';
import { localTodayISO } from '@/lib/utils/dates';

interface Props {
  chart:    ChartDefinitionDetail;
  data:     TrackingDataPoint[];
  fromDate: string;
  toDate:   string;
}

const CIRCLE_R = 5;
const STEP     = 20;
const LABEL_W  = 100;
const ROW_H    = 32;
const DATE_H   = 22;
const STREAK_W = 56;
const PAD_R    = 8;

type DayStatus = 'done' | 'missed' | 'nodata' | 'future';

function buildDates(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(fromDate + 'T12:00:00');
  const end    = new Date(toDate   + 'T12:00:00');
  while (cursor <= end) {
    const [cy, cm, cd] = [cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()];
    dates.push(`${cy}-${String(cm).padStart(2, '0')}-${String(cd).padStart(2, '0')}`);

    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function ChainChart({ chart, data, fromDate, toDate }: Readonly<Props>) {
  const seriesLinks = chart.links.filter(l => l.metric_role === 'series');

  if (!seriesLinks.length) {
    return <ChartEmptyState title={chart.title} message="No series configured. Add boolean metrics in Settings → Charts." />;
  }

  const today      = localTodayISO();
  const dates      = buildDates(fromDate, toDate);
  const entryDates = new Set(data.map(dp => dp.date));
  const valueByDate = new Map(data.map(dp => [dp.date, dp.values]));

  const getStatus = (date: string, trackableId: number): DayStatus => {
    if (date > today)             return 'future';
    if (!entryDates.has(date))    return 'nodata';
    return (valueByDate.get(date)?.[trackableId] ?? 0) >= 1 ? 'done' : 'missed';
  };

  const streaks = seriesLinks.map(link => {
    let s = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (getStatus(dates[i], link.trackable_id) === 'done') s++;
      else break;
    }
    return s;
  });

  const cx   = (i: number) => LABEL_W + CIRCLE_R + i * STEP;
  const svgW = LABEL_W + dates.length * STEP + STREAK_W + PAD_R;
  const svgH = DATE_H + seriesLinks.length * ROW_H + 4;

  const showDateLabel = (date: string, i: number) =>
    i === 0 || new Date(date + 'T12:00:00').getDay() === 0 || date === today;

  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{chart.title}</h3>
      <div className="chart-scroll">
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>

          {/* Date labels */}
          {dates.map((date, i) => {
            if (!showDateLabel(date, i)) return null;
            const isToday = date === today;
            return (
              <g key={`dl-${date}`}>
                <circle cx={cx(i)} cy={5} r={1.5}
                  fill={isToday ? 'var(--text)' : 'var(--text-faint)'} />
                <text x={cx(i)} y={DATE_H - 4} textAnchor="middle"
                  className={`chain-date-label${isToday ? ' chain-date-label--today' : ''}`}>
                  {isToday ? 'Today' : date.slice(5)}
                </text>
              </g>
            );
          })}

          {/* Rows */}
          {seriesLinks.map((link, rowIdx) => {
            const rowCY  = DATE_H + rowIdx * ROW_H + ROW_H / 2;
            const color  = link.trackable.color_hex ?? 'var(--accent)';
            const streak = streaks[rowIdx];

            return (
              <g key={`row-${link.trackable_id}`}>
                {/* Emoji label */}
                <text x={2} y={rowCY + 5} className="chain-row-emoji">
                  {link.trackable.emoji ?? '•'}
                </text>
                {/* Name label */}
                <text x={22} y={rowCY + 4} className="chain-row-name">
                  {link.trackable.name}
                </text>

                {/* Connecting lines */}
                {dates.map((date, i) => {
                  if (i === 0) return null;
                  const s1 = getStatus(dates[i - 1], link.trackable_id);
                  const s2 = getStatus(date, link.trackable_id);
                  const chained = s1 === 'done' && s2 === 'done';
                  return (
                    <line key={`ln-${date}`}
                      x1={cx(i - 1)} y1={rowCY} x2={cx(i)} y2={rowCY}
                      stroke={chained ? color : 'var(--border)'}
                      strokeWidth={chained ? 2.5 : 1.5}
                      opacity={chained ? 0.9 : 0.35}
                    />
                  );
                })}

                {/* Day circles */}
                {dates.map((date, i) => {
                  const status  = getStatus(date, link.trackable_id);
                  const isToday = date === today;
                  const x = cx(i);
                  const r = isToday ? CIRCLE_R + 1 : CIRCLE_R;

                  const circleFill =
                    status === 'done'   ? color         :
                    status === 'future' ? 'transparent' : 'var(--bg)';

                  const circleStroke =
                    status === 'done'   ? color                :
                    status === 'missed' ? 'var(--text-faint)'  :
                                         'var(--border)';

                  const circleOpacity =
                    status === 'nodata' || status === 'future' ? 0.2 : 1;

                  return (
                    <g key={`dot-${date}`}>
                      {isToday && (
                        <circle cx={x} cy={rowCY} r={r + 3.5}
                          fill="none" stroke={color} strokeWidth={1} opacity={0.35} />
                      )}
                      <circle cx={x} cy={rowCY} r={r}
                        fill={circleFill}
                        stroke={circleStroke}
                        strokeWidth={status === 'missed' ? 1.5 : 1}
                        opacity={circleOpacity}>
                        <title>{date} · {link.trackable.name}: {status}</title>
                      </circle>
                    </g>
                  );
                })}

                {/* Streak count */}
                <text
                  x={cx(dates.length - 1) + CIRCLE_R + 8}
                  y={rowCY + 4}
                  className="chain-streak-text"
                  style={{
                    fontWeight: streak > 0 ? 700 : 400,
                    fill: streak >= 7 ? color
                        : streak > 0  ? 'var(--text-muted)'
                        :               'var(--text-faint)',
                  }}>
                  {streak > 0 ? `🔥 ${streak}` : '—'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
