'use client';

/**
 * TrackableSettings
 *
 * Manage daily_trackables: add, rename, toggle active, reorder.
 * Uses ManageableList for boolean (habit) trackables.
 * Numeric and aggregate trackables are listed read-only (they need special handling).
 */

import { ManageableList } from './ManageableList';
import type { DailyTrackableRow } from '@/types/schema';

interface Props {
  trackables: DailyTrackableRow[];
}

export function TrackableSettings({ trackables }: Props) {
  const boolean   = trackables.filter(t => t.track_type === 'boolean');
  const numeric   = trackables.filter(t => t.track_type === 'numeric');
  const aggregate = trackables.filter(t => t.track_type === 'aggregate');

  return (
    <div>
      {/* Boolean trackables (habits) — fully manageable */}
      <ManageableList
        title="Habits"
        description="Boolean (done / not done) trackables shown on the Overview tab of the daily entry."
        tableName="daily_trackables"
        nameColumn="name"
        items={boolean}
        extraDefaultFields={{ track_type: 'boolean' }}
        addFields={[
          { key: 'emoji',      label: 'Emoji',      type: 'text', placeholder: '💧', width: 64   },
          { key: 'name',       label: 'Habit name', type: 'text', placeholder: 'e.g. Water', required: true },
          { key: 'color_hex',  label: 'Color',      type: 'color', width: 48 },
        ]}
        renderName={item => <><span className="trackable-emoji">{String(item.emoji ?? '')}</span>{String(item.name)}</>}
      />

      {/* Numeric trackables — manageable (add / toggle active) */}
      <ManageableList
        title="Numeric Metrics"
        description="Slider-based trackables (0–10) shown on the Metrics tab of the daily entry. Mood, Energy, Pain, Brain Fog, Fatigue."
        tableName="daily_trackables"
        nameColumn="name"
        items={numeric}
        extraDefaultFields={{ track_type: 'numeric' }}
        addFields={[
          { key: 'emoji',     label: 'Emoji',        type: 'text', placeholder: '😊', width: 64   },
          { key: 'name',      label: 'Metric name',  type: 'text', placeholder: 'e.g. Nausea', required: true },
          { key: 'color_hex', label: 'Color',        type: 'color', width: 48 },
        ]}
        renderName={item => <><span className="trackable-emoji">{String(item.emoji ?? '')}</span>{String(item.name)}</>}
      />

      {/* Aggregate trackables — read-only (computed by DB triggers) */}
      {aggregate.length > 0 && (
        <div className="settings-section">
          <div className="settings-section__header">
            <span className="settings-section__title">Aggregate Metrics</span>
          </div>
          <p className="settings-section__desc">
            Computed automatically from surveys or questionnaires. Not editable here.
          </p>
          {aggregate.map(t => (
            <div key={t.id} className="manage-item">
              <span className="manage-item__name">
                <span className="trackable-emoji">{t.emoji ?? ''}</span>{t.name}
              </span>
              <span className="badge">aggregate</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
