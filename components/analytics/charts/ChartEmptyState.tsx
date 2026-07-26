/**
 * components/analytics/charts/ChartEmptyState.tsx
 *
 * Shared early-return component for all chart types.
 * Replaces 2 near-identical guard blocks at the top of each of the 6 charts.
 *
 * Returns null if message is empty (allows conditional usage).
 */

interface Props {
  title:   string;
  message: string;
}

export function ChartEmptyState({ title, message }: Readonly<Props>) {
  return (
    <div className="chart-block">
      <h3 className="chart-block__title">{title}</h3>
      <p className="empty-state">{message}</p>
    </div>
  );
}
