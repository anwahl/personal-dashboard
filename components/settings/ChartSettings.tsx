'use client';

/**
 * ChartSettings — the Analytics charts, grouped by chart category.
 *
 * Categories are the tabs on the Analytics page; charts with no category sit
 * in an Uncategorized group at the bottom. Each chart is one row (title, type,
 * an issues badge). Its metrics are edited in a dialog (⋯ → Edit metrics).
 * Charts are deactivated, never deleted.
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  addChartLink, removeChartLink, toggleChartActive, setChartCategory,
  updateChartSortOrders, createChartDefinition, renameChart,
} from '@/lib/dal/charts';
import { addSettingsItem, updateSettingsItem, toggleSettingsItem, batchSetSortOrder } from '@/lib/dal/settings';
import { HierarchicalList, type NormalizedChild } from './HierarchicalList';
import type { AddField } from './FieldInputs';
import { TrackablePicker } from './TrackablePicker';
import { Badge, Button, EmptyState, IconDisplay, ManageItem, RowMenu } from '@/components/ui';
import type { ChartDefinitionDetail, ChartCategoryRow, ChartTrackableLinkDetail } from '@/types/dal';
import type { DailyTrackableRow, ChartType, MetricRole, IconRow } from '@/types/schema';

// ── Chart type metadata ───────────────────────────────────────────────────────

interface ChartTypeMeta {
  label:       string;
  validRoles:  MetricRole[];
  requirement: string;
}

const CHART_TYPE_META: Record<ChartType, ChartTypeMeta> = {
  scatter:  { label: '✦ Scatter',           validRoles: ['x_axis', 'y_axis'], requirement: 'Needs one X axis and one Y axis metric' },
  line:     { label: '📈 Line',             validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
  timeline: { label: '🗓 Timeline scatter', validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
  bar:      { label: '📊 Bar',             validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
  chain:    { label: '🔗 Chain',           validRoles: ['series'],            requirement: 'Needs at least one boolean series metric' },
  heatmap:  { label: '🟦 Heatmap',         validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
};

const ROLE_LABELS: Record<MetricRole, string> = {
  series: 'Series', x_axis: 'X axis', y_axis: 'Y axis',
};

// ── Validation ────────────────────────────────────────────────────────────────

function getWarnings(chartType: ChartType, links: { metric_role: MetricRole }[]): string[] {
  const roles = links.map(l => l.metric_role);
  const warns: string[] = [];
  if (chartType === 'scatter') {
    if (!roles.includes('x_axis')) warns.push('Missing X axis metric');
    if (!roles.includes('y_axis')) warns.push('Missing Y axis metric');
    if (roles.filter(r => r === 'x_axis').length > 1) warns.push('Only one X axis allowed');
    if (roles.filter(r => r === 'y_axis').length > 1) warns.push('Only one Y axis allowed');
    if (roles.includes('series'))                       warns.push('Scatter uses X/Y axis, not "series" role');
  } else {
    if (!roles.includes('series')) warns.push(CHART_TYPE_META[chartType].requirement);
    if (roles.includes('x_axis') || roles.includes('y_axis'))
      warns.push(`${CHART_TYPE_META[chartType].label} uses "series" role, not axis roles`);
  }
  return warns;
}

/** Whether adding another metric with this role would break the chart's rules. */
function roleIsFull(chartType: ChartType, links: { metric_role: MetricRole }[], role: MetricRole): boolean {
  return chartType === 'scatter' && role !== 'series' && links.some(l => l.metric_role === role);
}

// ── Metrics editor (dialog content) ───────────────────────────────────────────

function ChartMetricsEditor({
  chartId, chartType, initialLinks, trackables, icons, onLinksChange,
}: Readonly<{
  chartId:       number;
  chartType:     ChartType;
  initialLinks:  ChartTrackableLinkDetail[];
  trackables:    DailyTrackableRow[];
  icons:         IconRow[];
  onLinksChange: (links: ChartTrackableLinkDetail[]) => void;
}>) {
  const supabase = createClient();
  const meta     = CHART_TYPE_META[chartType];
  const [links,   setLinks]   = useState(initialLinks);
  const [selT,    setSelT]    = useState('');
  // Start on the first role that still has room (e.g. Y axis once X is set).
  const [selRole, setSelRole] = useState<MetricRole>(
    () => meta.validRoles.find(r => !roleIsFull(chartType, initialLinks, r)) ?? meta.validRoles[0]);
  const [saving,  setSaving]  = useState(false);

  const warnings  = getWarnings(chartType, links);
  const linkedIds = new Set(links.map(l => l.trackable_id));
  const full      = roleIsFull(chartType, links, selRole);

  const update = (next: ChartTrackableLinkDetail[]) => { setLinks(next); onLinksChange(next); };

  const add = async () => {
    const tid = Number(selT);
    if (!tid || linkedIds.has(tid) || full || saving) return;
    setSaving(true);
    try {
      const row = await addChartLink(supabase, chartId, tid, selRole, links.length);
      const trackable = trackables.find(t => t.id === tid)!;
      const next = [...links, { ...row, trackable }];
      update(next);
      setSelT('');
      const open = meta.validRoles.find(r => !roleIsFull(chartType, next, r));
      if (open) setSelRole(open);
    } finally { setSaving(false); }
  };

  const remove = async (linkId: number) => {
    await removeChartLink(supabase, linkId);
    update(links.filter(l => l.id !== linkId));
  };

  return (
    <div className="chart-metrics">
      <p className="chart-metrics__requirement">{meta.requirement}.</p>

      {warnings.length > 0 && (
        <div className="chart-metrics__warnings">
          {warnings.map(w => <p key={w} className="chart-metrics__warning">⚠️ {w}</p>)}
        </div>
      )}

      <div className="manage-list">
        {links.length === 0 && <EmptyState>No metrics linked yet.</EmptyState>}
        {links.map(link => (
          <ManageItem
            key={link.id}
            menu={
              <RowMenu
                label={link.trackable.name}
                items={[{ label: 'Remove from chart', onSelect: () => remove(link.id), destructive: true }]}
              />
            }
          >
            <IconDisplay icon={icons.find(i => i.id === link.trackable.icon_id) ?? null} size="sm" className="trackable-emoji" />
            {link.trackable.name}
            <Badge>{ROLE_LABELS[link.metric_role]}</Badge>
          </ManageItem>
        ))}
      </div>

      <div className="manage-add-row">
        <TrackablePicker
          trackables={trackables.filter(t => !linkedIds.has(t.id))}
          icons={icons}
          value={selT}
          onChange={setSelT}
          placeholder="Add metric…"
          showType
        />
        {meta.validRoles.length > 1 && (
          <select aria-label="Role" value={selRole} onChange={e => setSelRole(e.target.value as MetricRole)}>
            {meta.validRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        )}
        <Button variant="accent" size="sm" onClick={add} disabled={!selT || saving || full}>
          {saving ? '…' : '+ Add'}
        </Button>
        {full && <p className="manage-add-row__hint">This chart already has its {ROLE_LABELS[selRole]} metric.</p>}
      </div>
    </div>
  );
}

// ── ChartSettings ─────────────────────────────────────────────────────────────

const CHART_FIELDS: AddField[] = [
  { key: 'name', type: 'text', label: 'Title', placeholder: 'Chart title…', required: true },
  {
    key: 'chart_type', type: 'select', label: 'Type', defaultValue: 'line', showInEdit: false,
    options: Object.entries(CHART_TYPE_META).map(([value, m]) => ({ value, label: m.label })),
  },
];

function toChild(c: ChartDefinitionDetail): NormalizedChild {
  return {
    id:         c.id,
    name:       c.title,
    is_active:  c.is_active,
    sort_order: c.sort_order ?? 0,
    chart_type: c.chart_type,
    links:      c.links,
  };
}

interface Props {
  chartDefinitions: ChartDefinitionDetail[];
  trackables:       DailyTrackableRow[];
  categories:       ChartCategoryRow[];
  icons:            IconRow[];
}

export function ChartSettings({ chartDefinitions, trackables, categories, icons }: Readonly<Props>) {
  const supabase = createClient();

  return (
    <HierarchicalList
      title="Charts"
      description="Each category is a tab on the Analytics page. ⋯ → Edit metrics to choose what a chart shows."
      catPlaceholder="New category… (e.g. Sleep)"
      childFields={CHART_FIELDS}
      initialCategories={categories.map(c => ({
        id:         c.id,
        name:       c.name,
        is_active:  c.is_active,
        sort_order: c.sort_order ?? 0,
        children:   chartDefinitions.filter(d => d.category_id === c.id).map(toChild),
      }))}
      uncategorized={chartDefinitions.filter(d => d.category_id == null).map(toChild)}
      renderChildName={child => {
        const type   = child.chart_type as ChartType;
        const links  = (child.links as ChartTrackableLinkDetail[] | undefined) ?? [];
        const issues = getWarnings(type, links).length;
        return (
          <>
            {child.name}
            <Badge>{CHART_TYPE_META[type].label}</Badge>
            {issues > 0 && <Badge variant="warn">{issues === 1 ? '1 issue' : `${issues} issues`}</Badge>}
          </>
        );
      }}
      childDialog={{
        label: 'Edit metrics',
        title: child => <>Metrics for &ldquo;{child.name}&rdquo;</>,
        render: (child, patch) => (
          <ChartMetricsEditor
            chartId={child.id}
            chartType={child.chart_type as ChartType}
            initialLinks={(child.links as ChartTrackableLinkDetail[] | undefined) ?? []}
            trackables={trackables}
            icons={icons}
            onLinksChange={links => patch({ links })}
          />
        ),
      }}
      dal={{
        addCategory:       (name, sort)  => addSettingsItem(supabase, 'chart_categories', { name, sort_order: sort }),
        updateCategory:    async (id, name) => { await updateSettingsItem(supabase, 'chart_categories', id, { name }); },
        toggleCategory:    (id, active)  => toggleSettingsItem(supabase, 'chart_categories', id, active),
        reorderCategories: updates       => batchSetSortOrder(supabase, 'chart_categories', updates),
        addChild:          async (catId, values, sort) => ({
          ...await createChartDefinition(supabase, {
            title:       String(values.name),
            chart_type:  values.chart_type as ChartType,
            category_id: catId,
            sort_order:  sort,
            is_active:   true,
          }),
          links: [],
        }),
        updateChild:       (id, values)  => renameChart(supabase, id, String(values.name)),
        toggleChild:       (id, active)  => toggleChartActive(supabase, id, active),
        reorderChildren:   updates       => updateChartSortOrders(supabase, updates),
        moveChild:         (id, catId)   => setChartCategory(supabase, id, catId),
      }}
    />
  );
}
