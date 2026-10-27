'use client';

/**
 * LastTimeTracker — reusable component for Hub and /last-time landing page.
 *
 * Shows each item as: [emoji] [label] [days ago] [date]
 * Custom items have a "Log today" button.
 * Sort options: sort_order (default) or days_ago ascending.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@/lib/supabase/client';
import { logCustomLastTime }      from '@/lib/dal/lasttime';
import {
  Button, Card, CardActions, CardBody, CardHeader, CardSection, CardTitle,
  Dialog, IconDisplay, EmptyState, DateField, ListItem, RowMenu,
} from '@/components/ui';
import type { LastTimeEntry }      from '@/types/dal';
import type { IconRow }            from '@/types/schema';
import { formatDaysAgo, formatMediumDate } from '@/lib/utils/dates';
import { useContextDate } from '@/components/sections/DayContext';

function daysAgoFromDate(dateStr: string, today: string): number {
  const [ty, tm, td] = today.split('-').map(Number);
  const [dy, dm, dd] = dateStr.split('-').map(Number);
  return Math.round(
    (new Date(ty, tm - 1, td).getTime() - new Date(dy, dm - 1, dd).getTime()) / 86_400_000
  );
}

interface Props {
  entries:  LastTimeEntry[];
  icons:    IconRow[];
  compact?: boolean;
}

function daysAgoColorClass(days: number | null): string {
  if (days === null) return 'color--muted';
  if (days <= 3)     return 'color--success';
  if (days <= 14)    return 'color--mid';
  if (days <= 60)    return 'color--danger';
  return 'color--danger';
}

export function LastTimeTracker({ entries, icons, compact = false }: Readonly<Props>) {
  // The ✓ button logs this day and days count to it (a daily page's date
  // when placed on one, otherwise today).
  const contextDate = useContextDate();
  const supabase = createClient();
  const router   = useRouter();
  const [items,          setItems]          = useState<LastTimeEntry[]>(entries);
  const [sortBy,         setSortBy]         = useState<'order' | 'recent'>('order');
  const [logging,        setLogging]        = useState<Set<number>>(new Set());
  // The item is kept after closing so the title doesn't blank out while
  // the dialog's exit animation plays; `datePickerOpen` controls visibility.
  const [datePickerItem, setDatePickerItem] = useState<LastTimeEntry | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickedDate,     setPickedDate]     = useState<string>('');

  // Re-sync when server refreshes (router.refresh() from LastTimeSettings)
  useEffect(() => { setItems(entries); }, [entries]);

  const sorted = [...items].sort((a, b) =>
    sortBy === 'order'
      ? (a.sort_order ?? 0) - (b.sort_order ?? 0)
      : (a.days_ago ?? 99999) - (b.days_ago ?? 99999)
  );

  const logToday = useCallback(async (item: LastTimeEntry) => {
    if (!item.custom_id || logging.has(item.id)) return;
    setLogging(prev => new Set(prev).add(item.id));
    try {
      const today = contextDate;
      await logCustomLastTime(supabase, item.custom_id, today);
      setItems(prev => prev.map(i =>
        // IDs can collide across source tables — match category too
        i.id === item.id && i.category === item.category
          ? { ...i, last_date: today, days_ago: 0 } : i
      ));
    } finally {
      setLogging(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }, [supabase, logging, contextDate]);

  const openDatePicker = useCallback((item: LastTimeEntry) => {
    setDatePickerItem(item);
    setPickedDate(item.last_date ?? contextDate);
    setDatePickerOpen(true);
  }, [contextDate]);

  const saveCustomDate = useCallback(async () => {
    if (!datePickerItem?.custom_id || !pickedDate) return;
    await logCustomLastTime(supabase, datePickerItem.custom_id, pickedDate);
    setItems(prev => prev.map(i =>
      i.id === datePickerItem.id && i.category === datePickerItem.category
        ? { ...i, last_date: pickedDate, days_ago: daysAgoFromDate(pickedDate, contextDate) } : i
    ));
    setDatePickerOpen(false);
  }, [supabase, datePickerItem, pickedDate, contextDate]);

  return (
    <>
    <Card>
        <CardHeader>
          <CardTitle>
            Last Time...
          </CardTitle>
          <CardActions>
            <RowMenu
              label="Last Time"
              items={[
                { label: 'Custom order',      checked: sortBy === 'order',  onSelect: () => setSortBy('order') },
                { label: 'Most recent first', checked: sortBy === 'recent', onSelect: () => setSortBy('recent') },
                'separator',
                { label: 'Manage items…', onSelect: () => router.push('/settings?tab=lasttime') },
              ]}
            />
          </CardActions>
        </CardHeader>
      <CardBody>
        <CardSection>
          {sorted.length === 0 && (
            <EmptyState>No items configured. Add them in Settings → Last Time.</EmptyState>
          )}

          <div className="last-time-list">
            {sorted.map(item => (
              <ListItem
                key={`${item.category}-${item.id}`}
                leading={
                  <IconDisplay
                    icon={icons.find(i => i.id === item.icon_id) ?? null}
                    size="sm"
                    className="last-time-item__emoji"
                  />
                }
                title={item.label}
                meta={
                  <>
                    <span className={`last-time-item__ago ${daysAgoColorClass(item.days_ago)}`}>
                      {formatDaysAgo(item.days_ago)}
                    </span>
                    {item.last_date && <span>{formatMediumDate(item.last_date)}</span>}
                  </>
                }
                trailing={item.category === 'custom' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDatePicker(item)}
                      title="Log custom date"
                      aria-label={`Log a date for ${item.label}`}>
                      📅
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => logToday(item)}
                      busy={logging.has(item.id)}
                      title="Log today"
                      aria-label={`Log ${item.label} today`}>
                      ✓
                    </Button>
                  </>
                )}
              />
            ))}
          </div>
        </CardSection>
      </CardBody>
    </Card>

    <Dialog
      open={datePickerOpen}
      onOpenChange={setDatePickerOpen}
      title={<>Log date for &ldquo;{datePickerItem?.label}&rdquo;</>}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => setDatePickerOpen(false)}>Cancel</Button>
          <Button onClick={saveCustomDate} disabled={!pickedDate}>Save</Button>
        </>
      }
    >
      <DateField label="Date" value={pickedDate} max={contextDate} onChange={setPickedDate} />
    </Dialog>
    </>
  );
}
