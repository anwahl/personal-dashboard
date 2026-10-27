'use client';

/**
 * components/settings/IntegrationsSettings.tsx
 *
 * Settings section for external integrations.
 * Currently: iCal calendar feed subscription URL.
 */

import { useState }                from 'react';
import { createClient }            from '@/lib/supabase/client';
import { regenerateCalendarToken } from '@/lib/dal/calendar';
import { Button, ConfirmButton, SectionCard, CardSectionLabel, CardDescription } from '@/components/ui';
import type { CalendarTokenRow }   from '@/types/schema';

interface Props {
  token: CalendarTokenRow | null;
}

export function IntegrationsSettings({ token: initialToken }: Readonly<Props>) {
  const supabase = createClient();
  const [token,    setToken]    = useState(initialToken);
  const [copied,   setCopied]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const origin  = typeof window !== 'undefined' ? window.location.origin : '';
  const feedUrl = token ? `${origin}/api/calendar?token=${token.token}` : '';

  const copy = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    setLoading(true);
    try {
      const next = await regenerateCalendarToken(supabase);
      setToken(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Integrations">
      {/* ── iCal feed ──────────────────────────────────────────────────── */}
      <CardSectionLabel>📅 iCal calendar subscription</CardSectionLabel>
      <CardDescription>
        Subscribe to this URL in any calendar app to see your task reminders as calendar events.
        Tasks with a reminder set will appear as events with a built-in alert.
      </CardDescription>

      {token ? (
        <>
          <div className="ical-url-row">
            <input
              type="text"
              readOnly
              className="ical-url-input"
              value={feedUrl}
              onFocus={e => e.target.select()}
            />
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>

          <ul className="ical-instructions">
            <li><strong>Android:</strong> Install <a href="https://icsx5.bitfire.at/" target="_blank" rel="noreferrer">ICSx⁵</a> → Add calendar → URL subscription → paste URL above.</li>
            <li><strong>iOS / macOS:</strong> Calendar → File → New Calendar Subscription → paste URL.</li>
            <li><strong>Google Calendar:</strong> Other calendars → From URL → paste URL (note: Google polls infrequently).</li>
          </ul>

          <div className="margin-top-md">
            <ConfirmButton
              onConfirm={regenerate}
              size="sm"
              disabled={loading}
            >
              {loading ? 'Regenerating…' : '⟳ Regenerate token'}
            </ConfirmButton>
            <p className="manage-item__meta margin-top-sm">
              Regenerating invalidates the current URL — you&apos;ll need to re-subscribe in your calendar app.
            </p>
          </div>
        </>
      ) : (
        <p className="manage-item__meta">No calendar token found. Run the reminders migration SQL.</p>
      )}
    </SectionCard>
  );
}
