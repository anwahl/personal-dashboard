'use client';

/**
 * BrainDumpQuickAdd
 *
 * Lightweight standalone textarea for capturing brain dumps.
 * Can be dropped anywhere — Hub, Daily Entry, Brain Dump landing page.
 * On save, calls optional onSaved() callback so the parent can refresh.
 */

import { useState } from 'react';
import { createClient }             from '@/lib/supabase/client';
import { createStandaloneBrainDump } from '@/lib/dal/daily';
import { Button }                   from '@/components/ui/Button';
import { localTodayISO } from '@/lib/utils/dates';

interface Props {
  /** If provided, the dump will be linked to this entry */
  entryId?:   number;
  /** Anchor date for the dump_date default (defaults to today) */
  dumpDate?:  string;
  /** Called after a successful save */
  onSaved?:   (bodyMd: string, date: string) => void;
  placeholder?: string;
  compact?:   boolean;
}

export function BrainDumpQuickAdd({
  entryId,
  dumpDate,
  onSaved,
  placeholder = 'Brain dump…',
  compact = false,
}: Props) {
  const supabase = createClient();
  const [body,   setBody]   = useState('');
  const [date,   setDate]   = useState(dumpDate ?? localTodayISO());
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const submit = async () => {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      if (entryId) {
        // Link to daily entry via upsertBrainDump (already in daily.ts)
        const { upsertBrainDump } = await import('@/lib/dal/daily');
        await upsertBrainDump(supabase, entryId, date, text);
      } else {
        await createStandaloneBrainDump(supabase, date, text);
      }
      setSaved(true);
      onSaved?.(text, date);
      setBody('');
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div className={`brain-dump-quickadd${compact ? ' brain-dump-quickadd--compact' : ''}`}>
      {!compact && (
        <div className="brain-dump-quickadd__date-row">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="brain-dump-quickadd__date"
          />
        </div>
      )}
      <textarea
        className="brain-dump-quickadd__textarea"
        value={body}
        placeholder={placeholder}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        rows={compact ? 3 : 5}
      />
      <div className="brain-dump-quickadd__actions">
        {!compact && (
          <span className="brain-dump-quickadd__hint">⌘↵ to save</span>
        )}
        <Button
          variant="accent"
          size="sm"
          onClick={submit}
          disabled={!body.trim() || saving}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
