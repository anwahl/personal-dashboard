'use client';

/**
 * SWR hooks for reference / lookup data (dropdown options, type lists, etc.).
 *
 * Design decisions:
 *   - One module-level Supabase browser client shared by all hooks here.
 *     createBrowserClient() from @supabase/ssr manages an internal singleton
 *     per URL+key, so this does not create multiple connections.
 *   - SWR cache keys are namespaced under 'ref/' to avoid collisions with any
 *     future entity-level SWR keys (e.g. 'entity/prescription/42').
 *   - Error handling is left to the caller: destructure `error` from the hook
 *     return value and pass it to useToast() for display.
 *
 * What belongs here vs. server-side fetching in page.tsx:
 *   Server-fetch: data identified by a route param whose absence means 404
 *                 (the prescription, the appointment, the task — the "subject").
 *   SWR hooks:   everything else a component needs to render its own UI
 *                (people list, medication list, timing types, etc.).
 *
 * Adding a new hook:
 *   1. Import the DAL function.
 *   2. Add: export const useXxx = () => useSWR('ref/xxx', () => getXxx(supabase));
 *   3. The SWRConfig in ClientConfig handles cache behaviour globally — no
 *      per-hook config needed unless this hook has special requirements.
 */

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import {
  getAssignablePeople,
  getMedications,
  getMedicationTimingTypes,
  getAppointmentTypes,
  getTaskStatuses,
  getTaskPriorities,
  getTrackables,
  getTrackableCategories,
  getPeopleCategories,
  getMediaTypes,
  getMediaStatuses,
  getMediaGenres,
} from '@/lib/dal/reference';
import { getProviders } from '@/lib/dal/providers';

const supabase = createClient();

// ── People ────────────────────────────────────────────────────────────────────

/** People in assignable categories — used for task/appointment/Rx dropdowns. */
export const usePeople = () =>
  useSWR('ref/people/assignable', () => getAssignablePeople(supabase));

/** All people categories (for settings and person-page nav). */
export const usePeopleCategories = () =>
  useSWR('ref/people-categories', () => getPeopleCategories(supabase));

// ── Medications & Prescriptions ───────────────────────────────────────────────

/** All active medications (the drug reference list). */
export const useMedications = () =>
  useSWR('ref/medications', () => getMedications(supabase));

/** Timing types for medications (once daily, twice daily, etc.). */
export const useMedicationTimingTypes = () =>
  useSWR('ref/medication-timing-types', () => getMedicationTimingTypes(supabase));

// ── Providers ─────────────────────────────────────────────────────────────────

/** All active healthcare providers. */
export const useProviders = () =>
  useSWR('ref/providers', () => getProviders(supabase));

// ── Appointments ──────────────────────────────────────────────────────────────

/** Appointment type lookup (GP visit, specialist, etc.). */
export const useAppointmentTypes = () =>
  useSWR('ref/appointment-types', () => getAppointmentTypes(supabase));

// ── Tasks ─────────────────────────────────────────────────────────────────────

/** Task status rows (includes is_terminal flag). */
export const useTaskStatuses = () =>
  useSWR('ref/task-statuses', () => getTaskStatuses(supabase));

/** Task priority rows. */
export const useTaskPriorities = () =>
  useSWR('ref/task-priorities', () => getTaskPriorities(supabase));

// ── Trackables ────────────────────────────────────────────────────────────────

/** Active daily trackables (boolean + numeric habits/metrics). */
export const useTrackables = () =>
  useSWR('ref/trackables', () => getTrackables(supabase));

/** Trackable category groupings. */
export const useTrackableCategories = () =>
  useSWR('ref/trackable-categories', () => getTrackableCategories(supabase));

// ── Media ─────────────────────────────────────────────────────────────────────

export const useMediaTypes    = () => useSWR('ref/media-types',    () => getMediaTypes(supabase));
export const useMediaStatuses = () => useSWR('ref/media-statuses', () => getMediaStatuses(supabase));
export const useMediaGenres   = () => useSWR('ref/media-genres',   () => getMediaGenres(supabase));
