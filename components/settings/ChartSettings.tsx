'use client';

/**
 * ChartSettings
 *
 * Manage chart_definitions + chart_trackable_links.
 *
 * Features:
 * - "New Chart" form at the top (collapsible)
 * - Filter bar to search by chart title
 * - Up/down reorder buttons (swaps sort_order)
 * - Per-card validation: warns if required roles missing
 * - Role options filtered to only what's valid for the chart type
 * - Clear visual card separation
 */

import { useState, useCallback } from 'react';
import { createClient }          from '@/lib/supabase/client';
import { Button }                from '@/components/ui/Button';
import type { ChartDefinitionDetail } from '@/types/dal';
import type { DailyTrackableRow, ChartType, MetricRole } from '@/types/schema';

// ── Chart type metadata ───────────────────────────────────────────────────────

interface ChartTypeMeta {
  label:      string;
  validRoles: MetricRole[];
  /** Human-readable description of what's required */
  requirement: string;
}

const CHART_TYPE_META: Record<ChartType, ChartTypeMeta> = {
  scatter:  { label: '✦ Scatter',           validRoles: ['x_axis', 'y_axis'], requirement: 'Needs one X axis and one Y axis metric' },
  line:     { label: '📈 Line',             validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
  timeline: { label: '🗓 Timeline scatter', validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
  bar:      { label: '📊 Bar',             validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
  heatmap:  { label: '🟦 Heatmap',         validRoles: ['series'],            requirement: 'Needs at least one series metric'       },
};

const CHART_TYPE_OPTIONS = Object.entries(CHART_TYPE_META).map(([value, meta]) => ({
  value: value as ChartType,
  label: meta.label,
}));

const ROLE_LABELS: Record<MetricRole, string> = {
  series: 'Series',
  x_axis: 'X axis',
  y_axis: 'Y axis',
};

// ── Validation ────────────────────────────────────────────────────────────────

function getWarnings(chartType: ChartType, links: { metric_role: MetricRole }[]): string[] {
  const roles  = links.map(l => l.metric_role);
  const meta   = CHART_TYPE_META[chartType];
  const warns: string[] = [];

  if (chartType === 'scatter') {
    const xCount = roles.filter(r => r === 'x_axis').length;
    const yCount = roles.filter(r => r === 'y_axis').length;
    if (xCount === 0) warns.push('Missing X axis metric');
    if (yCount === 0) warns.push('Missing Y axis metric');
    if (xCount > 1)   warns.push('Only one X axis metric allowed');
    if (yCount > 1)   warns.push('Only one Y axis metric allowed');
    // Flag any series roles (invalid for scatter)
    if (roles.includes('series')) warns.push('Scatter charts don\'t use "series" role — use X axis or Y axis');
  } else {
    if (!roles.includes('series')) warns.push(meta.requirement);
    // Flag any axis roles (invalid for non-scatter)
    if (roles.includes('x_axis') || roles.includes('y_axis')) {
      warns.push(`${meta.label} uses "series" role, not axis roles`);
    }
  }
  return warns;
}

// ── ChartCard ─────────────────────────────────────────────────────────────────

function ChartCard({
  chart, idx, total, trackables,
  onMove, onUpdate, onDelete,
}: {
  chart:     ChartDefinitionDetail;
  idx:       number;
  total:     number;
  trackables: DailyTrackableRow[];
  onMove:    (id: number, dir: 'up' | 'down') => Promise<void>;
  onUpdate:  (id: number, patch: Partial<ChartDefinitionDetail>) => void;
  onDelete:  (id: number) => Promise<void>;
}) {
  const supabase = createClient();
  const [links,        setLinks]        = useState(chart.links);
  const [active,       setActive]       = useState(chart.is_active);
  const [selTrackable, setSelTrackable] = useState('');
  const [selRole,      setSelRole]      = useState<MetricRole>('series');
  const [saving,       setSaving]       = useState(false);
  const [moving,       setMoving]       = useState(false);
  const [confirming,   setConfirming]   = useState(false);

  const meta        = CHART_TYPE_META[chart.chart_type];
  const validRoles  = meta.validRoles;
  const warnings    = getWarnings(chart.chart_type, links);
  const linkedIds   = new Set(links.map(l => l.trackable_id));

  // Reset role selector if current selection isn't valid for this chart type
  const roleOptions = validRoles.map(r => ({ value: r, label: ROLE_LABELS[r] }));

  const toggleActive = async () => {
    const next = !active;
    setActive(next);
    await supabase.from('chart_definitions').update({ is_active: next }).eq('id', chart.id);
  };

  const addLink = useCallback(async () => {
    const tid = Number(selTrackable);
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
      setSelTrackable('');
    } finally { setSaving(false); }
  }, [supabase, chart.id, selTrackable, selRole, links.length, linkedIds, trackables]);

  const removeLink = useCallback(async (linkId: number) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
    await supabase.from('chart_trackable_links').delete().eq('id', linkId);
  }, [supabase]);

  const handleMove = async (dir: 'up' | 'down') => {
    setMoving(true);
    try { await onMove(chart.id, dir); }
    finally { setMoving(false); }
  };

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    await onDelete(chart.id);
  };

  return (
    <div className={`chart-settings-card${!active ? ' chart-settings-card--inactive' : ''}${warnings.length > 0 ? ' chart-settings-card--warn' : ''}`}>

      {/* ── Card header ── */}
      <div className="chart-settings-card__header">
        <div className="chart-settings-card__title-group">
          <span className="chart-settings-card__title">{chart.title}</span>
          <span className="badge">{meta.label}</span>
          {!active && <span className="badge badge--muted">inactive</span>}
        </div>
        <div className="chart-settings-card__actions">
          <Button variant="ghost" size="icon" onClick={() => handleMove('up')}
            disabled={idx === 0 || moving} title="Move up">↑</Button>
          <Button variant="ghost" size="icon" onClick={() => handleMove('down')}
            disabled={idx === total - 1 || moving} title="Move down">↓</Button>
          <Button variant="ghost" size="sm" onClick={toggleActive} title={active ? 'Deactivate' : 'Activate'}>
            {active ? '✓ Active' : '○ Inactive'}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}
            title={confirming ? 'Click again to confirm' : 'Delete chart'}>
            {confirming ? 'Sure?' : '✕'}
          </Button>
          {confirming && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
          )}
        </div>
      </div>

      {/* ── Validation warnings ── */}
      {warnings.length > 0 && (
        <div className="chart-settings-card__warnings">
          {warnings.map(w => (
            <p key={w} className="chart-settings-card__warning">⚠️ {w}</p>
          ))}
        </div>
      )}

      {/* ── Linked metrics ── */}
      <div className="chart-settings-card__links">
        {links.length === 0 && (
          <p className="empty-state" style={{ fontSize: '0.82rem', margin: '4px 0' }}>
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

      {/* ── Add metric row ── */}
      <div className="chart-settings-card__add-row">
        <select
          value={selTrackable}
          onChange={e => setSelTrackable(e.target.value)}
          className="settings-select"
        >
          <option value="">Add metric…</option>
          {trackables
            .filter(t => !linkedIds.has(t.id))
            .map(t => (
              <option key={t.id} value={t.id}>
                {t.emoji ?? ''} {t.name} ({t.track_type})
              </option>
            ))}
        </select>

        <select
          value={selRole}
          onChange={e => setSelRole(e.target.value as MetricRole)}
          className="settings-select"
        >
          {roleOptions.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <Button variant="accent" size="sm" onClick={addLink}
          disabled={!selTrackable || saving}>
          + Add
        </Button>
      </div>
    </div>
  );
}

// ── New chart form ────────────────────────────────────────────────────────────

function NewChartForm({
  onCreated,
}: {
  onCreated: (chart: ChartDefinitionDetail) => void;
}) {
  const supabase  = createClient();
  const [title,    setTitle]    = useState('');
  const [type,     setType]     = useState<ChartType>('line');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    const t = title.trim();
    if (!t || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('chart_definitions')
        .insert({ title: t, chart_type: type, sort_order: 999, is_active: true })
        .select().single();
      if (error || !data) return;
      onCreated({ ...data, links: [] } as ChartDefinitionDetail);
      setTitle('');
      setType('line');
    } finally { setCreating(false); }
  };

  return (
    <div className="chart-settings-new-form">
      <div className="chart-settings-new-form__fields">
        <input
          type="text"
          value={title}
          placeholder="Chart title…"
          className="chart-settings-new-form__title-input"
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') create(); }}
        />
        <select
          value={type}
          onChange={e => setType(e.target.value as ChartType)}
          className="settings-select"
        >
          {CHART_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <p className="chart-settings-new-form__hint">
        {CHART_TYPE_META[type].requirement}
      </p>
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
}

export function ChartSettings({ chartDefinitions, trackables }: Props) {
  const supabase   = createClient();
  const [charts,   setCharts]   = useState(
    [...chartDefinitions].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [filter,   setFilter]   = useState('');
  const [showNew,  setShowNew]  = useState(false);

  const filtered = filter
    ? charts.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()))
    : charts;

  const handleCreated = (chart: ChartDefinitionDetail) => {
    setCharts(prev => [...prev, chart]);
    setShowNew(false);
  };

  const handleMove = useCallback(async (chartId: number, dir: 'up' | 'down') => {
    const idx   = charts.findIndex(c => c.id === chartId);
    const other = dir === 'up' ? idx - 1 : idx + 1;
    if (other < 0 || other >= charts.length) return;

    const a = charts[idx];
    const b = charts[other];

    // Swap sort_orders
    const newCharts = charts.map(c =>
      c.id === a.id ? { ...c, sort_order: b.sort_order } :
      c.id === b.id ? { ...c, sort_order: a.sort_order } : c
    ).sort((x, y) => x.sort_order - y.sort_order);

    setCharts(newCharts);

    await Promise.all([
      supabase.from('chart_definitions').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('chart_definitions').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
  }, [charts, supabase]);

  const handleDelete = useCallback(async (chartId: number) => {
    setCharts(prev => prev.filter(c => c.id !== chartId));
    await supabase.from('chart_definitions').delete().eq('id', chartId);
  }, [supabase]);

  const handleUpdate = useCallback((chartId: number, patch: Partial<ChartDefinitionDetail>) => {
    setCharts(prev => prev.map(c => c.id === chartId ? { ...c, ...patch } : c));
  }, []);

  const invalidCount = filtered.filter(c => getWarnings(c.chart_type, c.links).length > 0).length;

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="chart-settings-topbar">
        <div className="chart-settings-topbar__left">
          <h2 className="settings-section-heading" style={{ margin: 0 }}>Charts</h2>
          {invalidCount > 0 && (
            <span className="badge badge--warn">{invalidCount} with issues</span>
          )}
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowNew(v => !v)}>
          {showNew ? '✕ Cancel' : '+ New chart'}
        </Button>
      </div>

      {/* ── New chart form ── */}
      {showNew && (
        <NewChartForm onCreated={handleCreated} />
      )}

      {/* ── Filter bar ── */}
      {charts.length > 3 && (
        <div className="chart-settings-filter">
          <input
            type="text"
            placeholder="Filter charts…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="chart-settings-filter__input"
          />
          {filter && (
            <Button variant="ghost" size="sm" onClick={() => setFilter('')}>Clear</Button>
          )}
        </div>
      )}

      {/* ── Chart cards ── */}
      {filtered.length === 0 && filter && (
        <p className="empty-state">No charts match "{filter}"</p>
      )}
      {filtered.length === 0 && !filter && (
        <p className="empty-state">No charts yet. Create one above.</p>
      )}

      {filtered.map((chart, idx) => (
        <ChartCard
          key={chart.id}
          chart={chart}
          idx={idx}
          total={filtered.length}
          trackables={trackables}
          onMove={handleMove}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
