-- ============================================================
-- pg_cron: schedule send-reminders Edge Function every 15 min
--
-- Prerequisites:
--   1. pg_cron extension must be enabled on your Supabase project
--      (Dashboard → Database → Extensions → pg_cron)
--   2. The send-reminders Edge Function must be deployed:
--      supabase functions deploy send-reminders
--   3. Set env vars on the Edge Function in Supabase Dashboard →
--      Settings → Edge Functions:
--        NTFY_URL, NTFY_TOPIC, NTFY_TOKEN (optional), APP_URL
--        RESEND_API_KEY, REMINDER_EMAIL_TO, REMINDER_EMAIL_FROM (optional)
--
-- Run this in the Supabase SQL editor AFTER deploying the function.
-- ============================================================

-- Enable pg_cron if not already enabled
-- (Do this from Dashboard → Database → Extensions, or uncomment:)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function to run every 15 minutes.
-- Replace YOUR_PROJECT_REF with your Supabase project reference ID
-- (visible in Settings → General → Reference ID, e.g. "abcdefghijklmnop").
-- Replace YOUR_ANON_KEY with your project's anon key.

SELECT cron.schedule(
  'send-task-reminders',          -- job name (unique)
  '*/15 * * * *',                 -- every 15 minutes
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('send-task-reminders');

-- ── Self-hosted Supabase note ────────────────────────────────────────────────
-- On self-hosted Supabase, the Edge Function URL will be:
--   http://YOUR_HOST:8000/functions/v1/send-reminders
-- or whatever your Kong/API gateway URL is.
-- The Authorization header uses your service_role key on self-hosted.
