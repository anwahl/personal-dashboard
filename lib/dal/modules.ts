/**
 * lib/dal/modules.ts
 *
 * The data each placeable component (module_enum) needs, loaded only for the
 * modules actually placed. Works with the server or the browser client.
 *
 * `date` is the context date: the page's date on a daily page, otherwise
 * today. Date-dependent data (task tabs, upcoming appointments, the day's
 * journal, the week's journal) is loaded for it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Module, IconRow, MediaTypeRow, MediaStatusRow, MediaStatusTypeLinkRow,
  AppointmentTypeRow, PersonRow, ProviderRow, PeopleCategoryRow, WeeklyEntryRow,
} from "@/types/schema";
import type {
  AppointmentDetail, ChartDefinitionDetail, JournalCategoryWithPrompts, LastTimeEntry,
  MediaEntryDetail, PrescriptionDetail, SectionDetail, TrackingDataPoint,
  WeeklyJournalCategoryWithPrompts, WeeklyJournalResponseDetail, PersonPageData,
  TrackableRefs, DayValues,
} from "@/types/dal";
import { getTasksByDateContext, type TaskContextData } from "./tasks";
import { getUpcomingAppointments, getAllAppointments } from "./appointments";
import { getLastTimeEntries } from "./lasttime";
import { getInProgressMediaEntries, getMediaEntries } from "./media";
import {
  getIconsRef, getMediaTypes, getMediaStatuses, getMediaStatusTypeLinks,
  getAppointmentTypes, getPeople, getPeopleCategories, getAssignablePeople,
  getJournalCategoriesWithPrompts, getChartDefinitions, getTrackableCategories, getTags,
} from "./reference";
import { getProviders } from "./providers";
import { getAllPeople, getSelfPerson, getPersonBySlug, getPersonPageData } from "./people";
import { toSlug } from "@/lib/utils/strings";
import { getAllPrescriptions } from "./prescriptions";
import { getDailyEntryRow } from "./daily";
import { getTrackableDetails, getTrackableLinks, getDayValues } from "./trackables";
import { getEveryPrescription } from "./prescriptions";
import { getJournalResponsesForEntry, type JournalResponseDetail } from "./journal";
import { getWeeklyEntry, getWeeklyJournalCategories, getWeeklyResponses } from "./weekly-journal";
import { getSections } from "./placement";
import { getCombinedTrackingData } from "./analytics";
import { addDays, getSundayOfWeek, getSundayWeekNumber, formatWeekRange } from "@/lib/utils/dates";

export interface ModuleData {
  /** Trackable categories placed outside the daily page: what they draw
   *  with, and the context day's saved values (null = no entry yet). */
  trackables?:       TrackableRefs & { values: DayValues | null };
  /** The context date: the daily page's date, otherwise today. */
  date:              string;
  tasks?:            TaskContextData;
  upcomingAppointments?: AppointmentDetail[];
  appointments?:     { upcoming: AppointmentDetail[]; past: AppointmentDetail[] };
  appointmentRefs?:  { types: AppointmentTypeRow[]; people: PersonRow[]; providers: ProviderRow[] };
  lastTime?:         LastTimeEntry[];
  icons?:            IconRow[];
  inProgressMedia?:  MediaEntryDetail[];
  mediaEntries?:     MediaEntryDetail[];
  media?:            { types: MediaTypeRow[]; statuses: MediaStatusRow[]; statusTypeLinks: MediaStatusTypeLinkRow[] };
  dailyJournal?:     { categories: JournalCategoryWithPrompts[]; responses: JournalResponseDetail[] };
  weeklyJournal?:    {
    weekStart: string; weekNum: number; weekRange: string;
    entry: WeeklyEntryRow | null;
    categories: WeeklyJournalCategoryWithPrompts[];
    responses: WeeklyJournalResponseDetail[];
  };
  /** QUICK_LOG: the daily page's tabs. */
  dailySections?:    SectionDetail[];
  prescriptionsByPerson?: { person: PersonRow; prescriptions: PrescriptionDetail[] }[];
  /** PEOPLE_LIST: the people tabs and your own person page (as /people). */
  people?:           { people: PersonRow[]; categories: PeopleCategoryRow[]; self: PersonPageData | null };
  analytics?:        { charts: ChartDefinitionDetail[]; data: TrackingDataPoint[]; fromDate: string; toDate: string };
}

/** How many upcoming appointments APPOINTMENT_QUICKLIST shows. */
const APPOINTMENT_LIMIT = 8;
/** ANALYTICS_LIST's first range, as on the Analytics page. */
const ANALYTICS_DAYS = 90;

/**
 * @param withTrackables also load what placed trackable categories need
 *   (Home and Quick add; the daily page has its own reference data).
 */
export async function getModuleData(
  client: SupabaseClient, modules: Set<Module>, date: string, withTrackables = false,
): Promise<ModuleData> {
  const has = (...ms: Module[]) => ms.some(m => modules.has(m));
  const skip = Promise.resolve(undefined);

  const weekStart = getSundayOfWeek(date);
  const analyticsFrom = addDays(date, -ANALYTICS_DAYS);

  const [
    tasks, upcomingAppointments, appointments, appointmentRefs, lastTime, icons,
    inProgressMedia, mediaEntries, media, dailyJournal, weeklyJournal, dailySections,
    prescriptionsByPerson, people, analytics, trackables,
  ] = await Promise.all([
    has("TASK_LIST") ? getTasksByDateContext(client, date) : skip,
    has("APPOINTMENT_QUICKLIST") ? getUpcomingAppointments(client, date, APPOINTMENT_LIMIT) : skip,
    has("APPOINTMENT_LIST") ? getAllAppointments(client, date) : skip,
    has("APPOINTMENT_LIST", "APPOINTMENT_ADD")
      ? Promise.all([getAppointmentTypes(client), getPeople(client), getProviders(client)])
          .then(([types, people, providers]) => ({ types, people, providers }))
      : skip,
    has("LAST_TIME") ? getLastTimeEntries(client, false, date) : skip,
    has("LAST_TIME", "ANALYTICS_LIST") ? getIconsRef(client) : skip,
    has("NOW_PLAYING_LIST") ? getInProgressMediaEntries(client) : skip,
    has("MEDIA_LIST") ? getMediaEntries(client) : skip,
    has("NOW_PLAYING_LIST", "MEDIA_LIST", "MEDIA_ADD")
      ? Promise.all([getMediaTypes(client), getMediaStatuses(client), getMediaStatusTypeLinks(client)])
          .then(([types, statuses, statusTypeLinks]) => ({ types, statuses, statusTypeLinks }))
      : skip,
    has("DAILY_JOURNAL")
      ? Promise.all([getJournalCategoriesWithPrompts(client), getDailyEntryRow(client, date)])
          .then(async ([categories, entry]) => ({
            categories,
            responses: entry ? await getJournalResponsesForEntry(client, entry.id) : [],
          }))
      : skip,
    has("WEEKLY_JOURNAL")
      ? Promise.all([getWeeklyJournalCategories(client), getWeeklyEntry(client, weekStart)])
          .then(async ([categories, entry]) => ({
            weekStart,
            weekNum:   getSundayWeekNumber(weekStart),
            weekRange: formatWeekRange(weekStart),
            entry,
            categories,
            responses: entry ? await getWeeklyResponses(client, entry.id) : [],
          }))
      : skip,
    has("QUICK_LOG") ? getSections(client, "DAILY") : skip,
    has("PRESCRIPTION_LIST")
      ? getAssignablePeople(client).then(people => Promise.all(
          people.map(async person => ({ person, prescriptions: await getAllPrescriptions(client, person.id) }))))
      : skip,
    has("PEOPLE_LIST")
      ? Promise.all([getAllPeople(client), getPeopleCategories(client), getSelfPerson(client)])
          .then(async ([people, categories, selfPerson]) => {
            // As /people: your own page, found the way /people finds it.
            const self = await getPersonBySlug(client, toSlug(selfPerson?.person_name ?? 'annie'));
            return { people, categories, self: self ? await getPersonPageData(client, self) : null };
          })
      : skip,
    has("ANALYTICS_LIST")
      ? getChartDefinitions(client).then(async charts => {
          const trackables = [...new Map(
            charts.flatMap(c => c.links.map(l => [l.trackable_id, l.trackable] as const)),
          ).values()];
          const data = await getCombinedTrackingData(client, trackables, analyticsFrom, date);
          return { charts, data, fromDate: analyticsFrom, toDate: date };
        })
      : skip,
    withTrackables
      ? Promise.all([
          getTrackableDetails(client), getTrackableLinks(client), getTrackableCategories(client),
          getIconsRef(client), getTags(client), getEveryPrescription(client), getDailyEntryRow(client, date),
        ]).then(async ([list, trackableLinks, trackableCategories, icons, tags, prescriptions, entry]) => ({
          trackables: list, trackableLinks, trackableCategories, icons, tags, prescriptions,
          values: entry ? await getDayValues(client, entry.id) : null,
        }))
      : skip,
  ]);

  return {
    date, tasks, upcomingAppointments, appointments, appointmentRefs, lastTime, icons,
    inProgressMedia, mediaEntries, media, dailyJournal, weeklyJournal, dailySections,
    prescriptionsByPerson, people, analytics, trackables,
  };
}
