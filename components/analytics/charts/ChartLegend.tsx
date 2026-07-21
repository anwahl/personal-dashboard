/**
 * components/analytics/charts/ChartLegend.tsx
 *
 * Shared legend used by ScatterChart, LineTrendChart, BarChart, TimelineScatterChart.
 * Renders colored swatches + trackable names inside a chart-info-bar.
 *
 * The `block` variant uses a taller rectangular swatch (bar/column charts).
 * The default variant uses the thin 3px line swatch (line/scatter charts).
 */

interface LegendItem {
  id:    number;
  name:  string;
  color: string | null;
  /** Optional suffix shown after the name, e.g. "(x)" or "(y)" */
  suffix?: string;
}

interface Props {
  items:    LegendItem[];
  /** Use the block (10px tall) swatch variant for bar charts. Default: false. */
  block?:   boolean;
  /** Extra content rendered before the legend items (e.g. Pearson r). */
  prefix?:  React.ReactNode;
}

export function ChartLegend({ items, block = false, prefix }: Props) {
  return (
    <div className="chart-info-bar">
      {prefix}
      <div className="chart-legend">
        {items.map(item => (
          <span key={item.id} className="chart-legend__item">
            <span
              className={`chart-legend__swatch${block ? ' chart-legend__swatch--block' : ''}`}
              style={{ background: item.color ?? 'var(--accent)' }}
            />
            {item.name}{item.suffix ? ` ${item.suffix}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
