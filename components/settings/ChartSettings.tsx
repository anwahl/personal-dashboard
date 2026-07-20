'use client';

/**
 * ChartSettings
 *
 * Manage chart_definitions + chart_trackable_links.
 * Create charts, assign metrics with roles (x_axis / y_axis / series), toggle active.
 */

import { useState, useCallback } from 'react';
import { createClient }         from '@/lib/supabase/client';
import { Button }               from '@/components/ui/Button';
import type { ChartDefinitionDetail } from '@/types/dal';
import type { DailyTrackableRow, ChartType, MetricRole } from '@/types/schema';

interface Props {
  chartDefinitions: ChartDefinitionDetail[];
  trackables:       DailyTrackableRow[];
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'line',    label: '📈 Line'    },
  { value: 'scatter', label: '✦ Scatter' },
  { value: 'heatmap', label: '🟦 Heatmap' },
];

const ROLE_OPTIONS: { value: MetricRole; label: string }[] = [
  { value: 'series', label: 'Series'  },
  { value: 'x_axis', label: 'X axis'  },
  { value: 'y_axis', label: 'Y axis'  },
];

function ChartCard({
  chart, trackables,
}: { chart: ChartDefinitionDetail; trackables: DailyTrackableRow[] }) {
  const supabase = createClient();
  const [links,   setLinks]   = useState(chart.links);
  const [active,  setActive]  = useState(chart.is_active);
  const [saving,  setSaving]  = useState(false);
  const [selTrackableId, setSelTrackableId] = useState('');
  const [selRole, setSelRole] = useState<MetricRole>('series');

  const linkedIds = new Set(links.map(l => l.trackable_id));

  const toggleActive = async () => {
    const next = !active;
    setActive(next);
    await supabase.from('chart_definitions').update({ is_active: next }).eq('id', chart.id);
  };

  const removeLink = useCallback(async (linkId: number, trackableId: number) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
    await supabase.from('chart_trackable_links').delete().eq('id', linkId);
  }, [supabase]);

  const addLink = useCallback(async () => {
    const tid = Number(selTrackableId);
    if (!tid || linkedIds.has(tid)) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('chart_trackable_links')
        .insert({
          chart_id:     chart.id,
          trackable_id: tid,
          metric_role:  selRole,
          sort_order:   links.length,
        })
        .select()
        .single();

      if (error || !data) return;

      const trackable = trackables.find(t => t.id === tid)!;
      setLinks(prev => [...prev, { ...data, trackable } as any]);
      setSelTrackableId('');
    } finally {
      setSaving(false);
    }
  }, [supabase, chart.id, selTrackableId, selRole, links.length, linkedIds, trackables]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">{chart.title}</span>
        <span className="badge">{chart.chart_type}</span>
        <Button variant="ghost" size="icon" onClick={toggleActive}>
          {active ? '✓' : '○'}
        </Button>
      </div>

      {/* Current links */}
      <div className="manage-list">
        {links.length === 0 && (
          <p className="empty-state" style={{ fontSize: '0.85rem' }}>No metrics linked.</p>
        )}
        {links.map(link => (
          <div key={link.id} className="manage-item">
            <span className="manage-item__name">
              {link.trackable.emoji ?? ''} {link.trackable.name}
            </span>
            <span className="badge">{link.metric_role}</span>
            <Button variant="danger" size="icon"
              onClick={() => removeLink(link.id, link.trackable_id)}>
              ✕
            </Button>
          </div>
        ))}
      </div>

      {/* Add a metric */}
      <div className="manage-add-row">
        <select
          value={selTrackableId}
          onChange={e => setSelTrackableId(e.target.value)}
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
          {ROLE_OPTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <Button variant="accent" size="sm" onClick={addLink}
          disabled={!selTrackableId || saving}>
          + Add
        </Button>
      </div>
    </div>
  );
}

export function ChartSettings({ chartDefinitions, trackables }: Props) {
  const supabase = createClient();
  const [charts,    setCharts]    = useState(chartDefinitions);
  const [newTitle,  setNewTitle]  = useState('');
  const [newType,   setNewType]   = useState<ChartType>('line');
  const [creating,  setCreating]  = useState(false);

  const createChart = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('chart_definitions')
        .insert({ title, chart_type: newType, sort_order: charts.length, is_active: true })
        .select()
        .single();
      if (error || !data) return;
      setCharts(prev => [...prev, { ...data, links: [] } as ChartDefinitionDetail]);
      setNewTitle('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h2 className="settings-section-heading">Charts</h2>
      <p className="settings-section-desc">
        Configure what appears on the Analytics page. Each chart reads from
        daily_trackables — no hardcoded metric names.
      </p>

      {charts.map(chart => (
        <ChartCard key={chart.id} chart={chart} trackables={trackables} />
      ))}

      {/* Create new chart */}
      <div className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">New Chart</span>
        </div>
        <div className="manage-add-row">
          <input
            type="text"
            value={newTitle}
            placeholder="Chart title…"
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createChart(); }}
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as ChartType)}
            className="settings-select"
          >
            {CHART_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button variant="accent" size="sm" onClick={createChart} disabled={!newTitle || creating}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
