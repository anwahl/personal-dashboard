'use client';

import { useState } from 'react';
import { createClient }             from '@/lib/supabase/client';
import { createStandaloneBrainDump, upsertBrainDump } from '@/lib/dal/daily';
import { Button, Card, CardActions, CardBody, CardHeader, CardTitle, DateField, TextAreaField, Item }                   from '@/components/ui';
import { localTodayISO } from '@/lib/utils/dates';

interface Props {
  entryId?:   number;
  dumpDate?:  string;
  onSaved?:   (bodyMd: string, date: string) => void;
  placeholder?: string;
  compact?:   boolean;
  /** Render just the fields + actions, without the card around them. */
  bare?:      boolean;
}

export function BrainDumpForm({
  entryId,
  dumpDate,
  onSaved,
  placeholder = 'Brain dump…',
  compact = false,
  bare = false,
}: Readonly<Props>) {
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

  const fields = (
    <>
      <DateField label="Date" value={date} onChange={setDate} />
      <TextAreaField label="Brain dump" value={body} placeholder={placeholder} onChange={setBody}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        rows={compact ? 3 : 5} />
      <CardActions>
        <Item value='⌘↵ to save' itemType='info' className='hide-on-touch' />
        <Button
          variant="accent"
          size="sm"
          onClick={submit}
          busy={saving}
          disabled={!body.trim()}
        >
          {saved ? '✓ Saved' : 'Save'}
        </Button>
      </CardActions>
    </>
  );

  if (bare) return fields;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Brain Dump</CardTitle>
      </CardHeader>
      <CardBody>
        {fields}
      </CardBody>
    </Card>
  );
}
