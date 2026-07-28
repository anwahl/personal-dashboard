/**
 * app/api/calendar/route.ts
 *
 * GET /api/calendar?token=[token]
 *
 * Returns an iCal feed (.ics) of all tasks that have a reminder_at set.
 * Authentication is via the token stored in calendar_tokens — the token
 * is embedded in the subscription URL shown in Settings.
 *
 * Since this route is called by calendar apps (not browsers with session
 * cookies), it uses a bare Supabase client with the anon key. Row-level
 * security is not relied on here; the token is the only gate.
 */

import { NextRequest, NextResponse }   from 'next/server';
import { createClient }                from '@supabase/supabase-js';
import { getTasksWithReminders }       from '@/lib/dal/tasks';
import { buildVCalendar }              from '@/lib/utils/ical';

// A bare Supabase client — no cookies, no session required.
// Safe to use server-side because this module never runs in the browser.
function makeSupabase() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing token', { status: 401 });
  }

  try {
    const supabase = makeSupabase();

    // Validate the token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('calendar_tokens')
      .select('id')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr) throw tokenErr;
    if (!tokenRow) {
      return new NextResponse('Invalid token', { status: 401 });
    }

    // Fetch all tasks with reminders (excludes completed)
    const tasks = await getTasksWithReminders(supabase);

    const icsContent = buildVCalendar(tasks);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type':        'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="tasks.ics"',
        // Calendar apps poll periodically; tell them to re-check every 15 min
        'Cache-Control':       'no-cache, max-age=900',
      },
    });
  } catch (err) {
    console.error('[/api/calendar] error:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
