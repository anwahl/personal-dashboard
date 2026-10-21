'use client';

/**
 * LastTimeTracker — reusable component for Hub and /last-time landing page.
 *
 * Shows each item as: [emoji] [label] [days ago] [date]
 * Custom items have a "Log today" button.
 * Sort options: sort_order (default) or days_ago ascending.
 */

import { useState, useCallback, useEffect } from 'react';
import { createClient }           from '@/lib/supabase/client';
import { logCustomLastTime }      from '@/lib/dal/lasttime';
import { Button, Card, CardActions, CardBody, CardGrid, CardHeader,
         CardSection, CardTitle, Dialog, FieldActions, IconDisplay, Item }
                                   from '@/components/ui';
import type { LastTimeEntry }      from '@/types/dal';
import type { IconRow }            from '@/types/schema';
import { formatDaysAgo, formatMediumDate, localTodayISO } from '@/lib/utils/dates';

function daysAgoFromDate(dateStr: string): number {
  const today = localTodayISO();
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
  const supabase = createClient();
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
      const today = localTodayISO();
      await logCustomLastTime(supabase, item.custom_id, today);
      setItems(prev => prev.map(i =>
        // IDs can collide across source tables — match category too
        i.id === item.id && i.category === item.category
          ? { ...i, last_date: today, days_ago: 0 } : i
      ));
    } finally {
      setLogging(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }, [supabase, logging]);

  const openDatePicker = useCallback((item: LastTimeEntry) => {
    setDatePickerItem(item);
    setPickedDate(item.last_date ?? localTodayISO());
    setDatePickerOpen(true);
  }, []);

  const saveCustomDate = useCallback(async () => {
    if (!datePickerItem?.custom_id || !pickedDate) return;
    await logCustomLastTime(supabase, datePickerItem.custom_id, pickedDate);
    setItems(prev => prev.map(i =>
      i.id === datePickerItem.id && i.category === datePickerItem.category
        ? { ...i, last_date: pickedDate, days_ago: daysAgoFromDate(pickedDate) } : i
    ));
    setDatePickerOpen(false);
  }, [supabase, datePickerItem, pickedDate]);

  return (
    <>
    <Card>
      <CardBody>
        <CardHeader>
          <CardTitle>
            Last Time...
          </CardTitle>
          <CardActions>
            <Button variant='action-alt' size='sm'
              className={`${sortBy === 'recent' ? ' btn--inactive' : ''}`}
              onClick={() => setSortBy('order')}>
                Custom Order
            </Button>
            
            <Button variant='action-alt' size='sm'
              className={`${sortBy === 'order' ? ' btn--inactive' : ''}`}
              onClick={() => setSortBy('recent')}>
                Most recent first
            </Button>
          </CardActions>
        </CardHeader>
        <CardSection>
          {sorted.length === 0 && (
            <p className="empty-state">No items configured. Add them in Settings → Last Time.</p>
          )}

          <div className="last-time-list">
            
             
            {sorted.map(item => (
              <span className='border__btm pad pad__btm margin-tb-md' key={`${item.category}-${item.id}`}  >
                <CardGrid columns={4} className=''>
                  <IconDisplay
                    icon={icons.find(i => i.id === item.icon_id) ?? null}
                    size="sm"
                    className="last-time-item__emoji"
                  />
                  <Item itemType='title' value={item.label} />
                  <Item itemType='info' value={formatMediumDate(item.last_date)} />
                  <Item itemType='meta' itemModifier={'bold'} value={formatDaysAgo(item.days_ago)} className={`${daysAgoColorClass(item.days_ago)}`} />
                </CardGrid>
              
                {item.category === 'custom' && (
                  <FieldActions alignment='right' className=''>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDatePicker(item)}
                      title="Log custom date">
                      📅
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => logToday(item)}
                      disabled={logging.has(item.id)}
                      title="Log today">
                      {logging.has(item.id) ? '…' : '✓'}
                    </Button>
                  </FieldActions>
                )}
              </span>
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
      <input
        type="date"
        value={pickedDate}
        max={localTodayISO()}
        onChange={e => setPickedDate(e.target.value)}
      />
    </Dialog>
    </>
  );
}
