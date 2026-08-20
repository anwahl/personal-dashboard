'use client';

import { useState } from 'react';
import { createClient }             from '@/lib/supabase/client';
import { createStandaloneBrainDump, upsertBrainDump } from '@/lib/dal/daily';
import { Button, Card, CardActions, CardBody, CardHeader, CardTitle, InputField, Item }                   from '@/components/ui';
import { localTodayISO } from '@/lib/utils/dates';

interface Props {
  entryId?:   number;
  dumpDate?:  string;
  onSaved?:   (bodyMd: string, date: string) => void;
  placeholder?: string;
  compact?:   boolean;
}

export function BrainDumpForm({
  entryId,
  dumpDate,
  onSaved,
  placeholder = 'Brain dump…',
  compact = false,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Brain Dump</CardTitle>
      </CardHeader>
      <CardBody>
        <InputField label='' id='bd-date'>
          <input
            id='bd-date'
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </InputField>
        <InputField label='' id='bd-value'>
          <textarea
            id='bd-value'
            value={body}
            placeholder={placeholder}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            rows={compact ? 3 : 5}
          />
        </InputField>
        <CardActions>
          <Item value='⌘↵ to save' itemType='info' />
          <Button
            variant="accent"
            size="sm"
            onClick={submit}
            disabled={!body.trim() || saving}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </Button>
        </CardActions>
      </CardBody>
    </Card>
  );
}
