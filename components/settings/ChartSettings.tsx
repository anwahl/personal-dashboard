'use client';

import { useState, useCallback } from 'react';
import {
  toggleChartActive, setChartCategory, removeChartLink,
  updateChartSortOrders, deleteChartDefinition,
} from '@/lib/dal/charts';
import { createClient }          from '@/lib/supabase/client';
import { Button }                from '@/components/ui/Button';
import { ConfirmButton }         from '@/components/ui/ConfirmButton';
import { ManageableList }        from './ManageableList';
import type { ChartDefinitionDetail, ChartCategoryRow } from '@/types/dal';
import type { DailyTrackableRow, ChartType, MetricRole } from '@/types/schema';

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

const CHART_TYPE_OPTIONS = Object.entries(CHART_TYPE_META).map(([value, meta]) => ({
  value: value as ChartType, label: meta.label,
}));

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
  // Chain charts should only have boolean trackables
  // (We can't check track_type here without links — callers should validate in UI)
  return warns;
}

// ── Filter matching ───────────────────────────────────────────────────────────

function matchesFilter(chart: ChartDefinitionDetail, q: string): boolean {
  if (!q) return true;
  const lq = q.toLowerCase();
  return (
    chart.title.toLowerCase().includes(lq) ||
    chart.chart_type.includes(lq) ||
    CHART_TYPE_META[chart.chart_type].label.toLowerCase().includes(lq) ||
    (chart.category?.name.toLowerCase().includes(lq) ?? false) ||
    chart.links.some(l => l.trackable.name.toLowerCase().includes(lq))
  );
}

// ── ChartCard ─────────────────────────────────────────────────────────────────

function ChartCard({
  chart, idx, total, trackables, categories,
  onMove, onDelete,
}: Readonly<{
  chart:      ChartDefinitionDetail;
  idx:        number;
  total:      number;
  trackables: DailyTrackableRow[];
  categories: ChartCategoryRow[];
  onMove:    (id: number, dir: 'up' | 'down') => Promise<void>;
  onDelete:  (id: number) => Promise<void>;
}>) {
  const supabase = createClient();
  const [links,      setLinks]      = useState(chart.links);
  const [active,     setActive]     = useState(chart.is_active);
  const [categoryId, setCategoryId] = useState<number | null>(chart.category_id);
  const [selT,       setSelT]       = useState('');
  const [selRole,    setSelRole]    = useState<MetricRole>(CHART_TYPE_META[chart.chart_type].validRoles[0]);
  const [saving,     setSaving]     = useState(false);

  const meta       = CHART_TYPE_META[chart.chart_type];
  const warnings   = getWarnings(chart.chart_type, links);
  const linkedIds  = new Set(links.map(l => l.trackable_id));
  const roleOptions = meta.validRoles.map(r => ({ value: r, label: ROLE_LABELS[r] }));

  const toggleActive = async () => {
    const next = !active; setActive(next);
    await toggleChartActive(supabase, chart.id, next);
  };

  const changeCategory = async (catId: string) => {
    const id = catId === '' ? null : Number(catId);
    setCategoryId(id);
    await setChartCategory(supabase, chart.id, id);
  };

  const addLink = useCallback(async () => {
    const tid = Number(selT);
    if (!tid || linkedIds.has(tid)) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('chart_trackable_links')
        .insert({ chart_id: chart.id, trackable_id: tid, metric_role: selRole, sort_order: links.length })
        .select().single();
      if (error || !data) return;
      const trackable = trackables.find(t => t.id === tid)!;
      setLinks(prev => [...prev, { ...data, trackable } as any]);
      setSelT('');
    } finally { setSaving(false); }
  }, [supabase, chart.id, selT, selRole, links.length, linkedIds, trackables]);

  const removeLink = async (linkId: number) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
    await removeChartLink(supabase, linkId);
  };

  const handleDelete = async () => {
    await onDelete(chart.id);
  };

  return (
    <div className={`chart-settings-card${!active ? ' chart-settings-card--inactive' : ''}${warnings.length > 0 ? ' chart-settings-card--warn' : ''}`}>

      <div className="chart-settings-card__header">
        <div className="chart-settings-card__title-group">
          <span className="chart-settings-card__title">{chart.title}</span>
          <span className="badge">{meta.label}</span>
          {!active && <span className="badge badge--muted">inactive</span>}
        </div>
        <div className="chart-settings-card__actions">
          <Button variant="ghost" size="icon" onClick={() => onMove(chart.id, 'up')}   disabled={idx === 0}            title="Move up">↑</Button>
          <Button variant="ghost" size="icon" onClick={() => onMove(chart.id, 'down')} disabled={idx === total - 1}    title="Move down">↓</Button>
          <Button variant="ghost" size="sm"   onClick={toggleActive}>{active ? '✓ Active' : '○ Inactive'}</Button>
          <ConfirmButton onConfirm={handleDelete} size="sm" label="✕" />
        </div>
      </div>

      {/* Category */}
      <div className="chart-settings-card__category-row">
        <span className="chart-settings-card__category-label">Category</span>
        <select
          value={categoryId ?? ''}
          onChange={e => changeCategory(e.target.value)}
          className="settings-select"
        >
          <option value="">— none —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Validation warnings */}
      {warnings.length > 0 && (
        <div className="chart-settings-card__warnings">
          {warnings.map(w => <p key={w} className="chart-settings-card__warning">⚠️ {w}</p>)}
        </div>
      )}

      {/* Linked metrics */}
      <div className="chart-settings-card__links">
        {links.length === 0 && (
          <p className="empty-state">
            No metrics linked. {meta.requirement}.
          </p>
        )}
        {links.map(link => (
          <div key={link.id} className="chart-settings-card__link-row">
            <span className="chart-settings-card__link-name">
              {link.trackable.emoji ?? ''} {link.trackable.name}
            </span>
            <span className="badge">{ROLE_LABELS[link.metric_role]}</span>
            <Button variant="danger" size="icon" onClick={() => removeLink(link.id)}>✕</Button>
          </div>
        ))}
      </div>

      {/* Add metric */}
      <div className="chart-settings-card__add-row">
        <select value={selT} onChange={e => setSelT(e.target.value)} className="settings-select">
          <option value="">Add metric…</option>
          {trackables.filter(t => !linkedIds.has(t.id)).map(t => (
            <option key={t.id} value={t.id}>{t.emoji ?? ''} {t.name} ({t.track_type})</option>
          ))}
        </select>
        <select value={selRole} onChange={e => setSelRole(e.target.value as MetricRole)} className="settings-select">
          {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <Button variant="accent" size="sm" onClick={addLink} disabled={!selT || saving}>+ Add</Button>
      </div>
    </div>
  );
}

// ── New chart form ────────────────────────────────────────────────────────────

function NewChartForm({ categories, onCreated }: Readonly<{
  categories: ChartCategoryRow[];
  onCreated:  (chart: ChartDefinitionDetail) => void;
}>) {
  const supabase  = createClient();
  const [title,    setTitle]    = useState('');
  const [type,     setType]     = useState<ChartType>('line');
  const [catId,    setCatId]    = useState<string>('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    const t = title.trim();
    if (!t || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('chart_definitions')
        .insert({ title: t, chart_type: type, category_id: catId ? Number(catId) : null, sort_order: 999, is_active: true })
        .select().single();
      if (error || !data) return;
      const cat = categories.find(c => c.id === Number(catId)) ?? null;
      onCreated({ ...data, links: [], category: cat } as ChartDefinitionDetail);
      setTitle(''); setType('line'); setCatId('');
    } finally { setCreating(false); }
  };

  return (
    <div className="chart-settings-new-form">
      <div className="chart-settings-new-form__fields">
        <input type="text" value={title} placeholder="Chart title…"
          className="chart-settings-new-form__title-input"
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') create(); }} />
        <select value={type} onChange={e => setType(e.target.value as ChartType)} className="settings-select">
          {CHART_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={catId} onChange={e => setCatId(e.target.value)} className="settings-select">
          <option value="">No category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <p className="chart-settings-new-form__hint">{CHART_TYPE_META[type].requirement}</p>
      <Button variant="accent" size="sm" onClick={create} disabled={!title.trim() || creating}>
        Create chart
      </Button>
    </div>
  );
}

// ── ChartSettings (main export) ───────────────────────────────────────────────

interface Props {
  chartDefinitions: ChartDefinitionDetail[];
  trackables:       DailyTrackableRow[];
  categories:       ChartCategoryRow[];
}

export function ChartSettings({ chartDefinitions, trackables, categories }: Readonly<Props>) {
  const supabase = createClient();
  const [charts, setCharts] = useState(
    [...chartDefinitions].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  );
  const [filter, setFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  const handleCreated = (chart: ChartDefinitionDetail) => {
    setCharts(prev => [...prev, chart]);
    setShowNew(false);
  };

  const handleMove = useCallback(async (chartId: number, dir: 'up' | 'down') => {
    const sorted = [...charts].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx    = sorted.findIndex(c => c.id === chartId);
    const other  = dir === 'up' ? idx - 1 : idx + 1;
    if (other < 0 || other >= sorted.length) return;
    const [a, b] = [sorted[idx], sorted[other]];
    if (a.sort_order == null || b.sort_order == null) return;
    const aSort = a.sort_order;
    const bSort = b.sort_order;
    setCharts(charts.map(c =>
      c.id === a.id ? { ...c, sort_order: bSort } :
      c.id === b.id ? { ...c, sort_order: aSort } : c
    ).sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0)));
    await updateChartSortOrders(supabase, [{ id: a.id, sort_order: bSort }, { id: b.id, sort_order: aSort }]);
  }, [charts, supabase]);

  const handleDelete = useCallback(async (chartId: number) => {
    setCharts(prev => prev.filter(c => c.id !== chartId));
    await deleteChartDefinition(supabase, chartId);
  }, [supabase]);

  // Filtered + sorted
  const filtered = charts.filter(c => matchesFilter(c, filter))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Group filtered charts by chart_type
  const typeOrder: ChartType[] = ['scatter', 'line', 'bar', 'timeline', 'heatmap'];
  const byType = new Map<ChartType, ChartDefinitionDetail[]>();
  for (const t of typeOrder) byType.set(t, []);
  for (const c of filtered) {
    const arr = byType.get(c.chart_type);
    if (arr) arr.push(c);
    else byType.set(c.chart_type, [c]);
  }

  const invalidCount = filtered.filter(c => getWarnings(c.chart_type, c.links).length > 0).length;

  // Flat index across all groups (for up/down within the full list)
  const flatFiltered = filtered;

  return (
    <div>
      {/* ── Category management ── */}
      <ManageableList
        title="Categories"
        description="Group charts into tabs on the Analytics page. Each active category becomes a tab."
        tableName="chart_categories"
        nameColumn="name"
        items={categories}
        addFields={[
          { key: 'name', label: 'Category name', type: 'text', placeholder: 'e.g. Sleep', required: true },
        ]}
      />

      {/* Top bar */}
      <div className="chart-settings-topbar">
        <div className="chart-settings-topbar__left">
          <h2 className="settings-section-heading settings-section-heading--flush">Charts</h2>
          {invalidCount > 0 && <span className="badge badge--warn">{invalidCount} with issues</span>}
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowNew(v => !v)}>
          {showNew ? '✕ Cancel' : '+ New chart'}
        </Button>
      </div>

      {/* New chart form */}
      {showNew && <NewChartForm categories={categories} onCreated={handleCreated} />}

      {/* Filter */}
      {charts.length > 2 && (
        <div className="chart-settings-filter">
          <input type="text" placeholder="Filter by title, type, or metric…"
            value={filter} onChange={e => setFilter(e.target.value)}
            className="chart-settings-filter__input" />
          {filter && <Button variant="ghost" size="sm" onClick={() => setFilter('')}>Clear</Button>}
        </div>
      )}

      {filtered.length === 0 && filter && (
        <p className="empty-state">No charts match "{filter}"</p>
      )}
      {filtered.length === 0 && !filter && !showNew && (
        <p className="empty-state">No charts yet. Create one above.</p>
      )}

      {/* Charts grouped by type */}
      {[...byType.entries()].map(([type, group]) => {
        if (!group.length) return null;
        return (
          <div key={type} className="chart-settings-type-group">
            <h3 className="chart-settings-type-group__heading">
              {CHART_TYPE_META[type].label}
            </h3>
            {group.map(chart => (
              <ChartCard
                key={chart.id}
                chart={chart}
                idx={flatFiltered.indexOf(chart)}
                total={flatFiltered.length}
                trackables={trackables}
                categories={categories}
                onMove={handleMove}
                onDelete={handleDelete}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
