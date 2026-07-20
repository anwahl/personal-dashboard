'use client';

/**
 * LastTimeTracker — reusable component for Hub and /last-time landing page.
 *
 * Shows each item as: [emoji] [label] [days ago] [date]
 * Custom items have a "Log today" button.
 * Sort options: sort_order (default) or days_ago ascending.
 */

import { useState, useCallback } from 'react';
import { createClient }           from '@/lib/supabase/client';
import { logCustomLastTime }       from '@/lib/dal/lasttime';
import { Button }                  from '@/components/ui/Button';
import type { LastTimeEntry }      from '@/types/dal';

interface Props {
  entries:  LastTimeEntry[];
  compact?: boolean;
}

function formatDaysAgo(days: number | null): string {
  if (days === null) return 'Never';
  if (days === 0)    return 'Today';
  if (days === 1)    return 'Yesterday';
  if (days < 7)     return `${days}d ago`;
  if (days < 30)    return `${Math.floor(days / 7)}w ago`;
  if (days < 365)   return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatDate(d: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function daysAgoColor(days: number | null): string {
  if (days === null) return 'var(--text-faint)';
  if (days <= 3)     return 'var(--success)';
  if (days <= 14)    return 'var(--text-muted)';
  if (days <= 60)    return 'var(--warn)';
  return 'var(--danger)';
}

export function LastTimeTracker({ entries, compact = false }: Props) {
  const supabase = createClient();
  const [items,   setItems]   = useState<LastTimeEntry[]>(entries);
  const [sortBy,  setSortBy]  = useState<'order' | 'recent'>('order');
  const [logging, setLogging] = useState<Set<number>>(new Set());

  const sorted = [...items].sort((a, b) =>
    sortBy === 'order'
      ? a.sort_order - b.sort_order
      : (a.days_ago ?? 99999) - (b.days_ago ?? 99999)
  );

  const logToday = useCallback(async (item: LastTimeEntry) => {
    if (!item.custom_id || logging.has(item.id)) return;
    setLogging(prev => new Set(prev).add(item.id));
    try {
      const today = new Date().toISOString().slice(0, 10);
      await logCustomLastTime(supabase, item.custom_id, today);
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, last_date: today, days_ago: 0 } : i
      ));
    } finally {
      setLogging(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }, [supabase, logging]);

  return (
    <div className="last-time-tracker">
      {!compact && (
        <div className="last-time-tracker__controls">
          <button
            type="button"
            className={`last-time-sort-btn${sortBy === 'order' ? ' last-time-sort-btn--active' : ''}`}
            onClick={() => setSortBy('order')}
          >
            Custom order
          </button>
          <button
            type="button"
            className={`last-time-sort-btn${sortBy === 'recent' ? ' last-time-sort-btn--active' : ''}`}
            onClick={() => setSortBy('recent')}
          >
            Most recent first
          </button>
        </div>
      )}

      {sorted.length === 0 && (
        <p className="empty-state">No items configured. Add them in Settings → Last Time.</p>
      )}

      <div className="last-time-list">
        {sorted.map(item => (
          <div key={`${item.category}-${item.id}`} className="last-time-item">
            <span className="last-time-item__emoji">{item.emoji ?? '•'}</span>
            <div className="last-time-item__body">
              <span className="last-time-item__label">{item.label}</span>
              {!compact && item.last_date && (
                <span className="last-time-item__date">{formatDate(item.last_date)}</span>
              )}
            </div>
            <span
              className="last-time-item__ago"
              style={{ color: daysAgoColor(item.days_ago) }}
            >
              {formatDaysAgo(item.days_ago)}
            </span>
            {item.category === 'custom' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logToday(item)}
                disabled={logging.has(item.id)}
                title="Log today"
              >
                {logging.has(item.id) ? '…' : '✓'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
