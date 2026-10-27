'use client';

/**
 * ModuleView — draws a placed component (module_enum) with its data.
 *
 * Each module is the same component its own page uses, unchanged. Forms
 * that live in a dialog on their page sit behind a "+ New …" button here.
 * The context date (useDay) is the daily page's date there, otherwise today.
 *
 * MODULE_VIEWS has one entry per module, so adding a value to module_enum
 * (and to MODULES in types/schema.ts) fails the type check until it's drawn.
 */

import { useState, type ReactNode } from 'react';
import { Button, EmptyState, type SaveState } from '@/components/ui';
import { TaskList }              from '@/components/tasks/TaskList';
import { QuickAddTaskForm, TaskDialog } from '@/components/tasks/TaskForm';
import { UpcomingAppointments }  from '@/components/appointments/UpcomingAppointments';
import { AppointmentsClient }    from '@/components/appointments/AppointmentsClient';
import { AppointmentDialog }     from '@/components/appointments/AppointmentForm';
import { LastTimeTracker }       from '@/components/last-time/LastTimeTracker';
import { QuickMediaLog }         from '@/components/media/QuickMediaLog';
import { MediaClient }           from '@/components/media/MediaClient';
import { MediaDialog }           from '@/components/media/MediaForm';
import { BrainDumpForm }         from '@/components/brain-dump/BrainDumpForm';
import BrainDumpList             from '@/components/brain-dump/BrainDumpClient';
import { JournalTab }            from '@/components/daily-log/JournalTab';
import { WeeklyJournalClient }   from '@/components/weekly-journal/WeeklyJournalClient';
import { PrescriptionsClient }   from '@/components/medications/PrescriptionsClient';
import { PrescriptionDialog }    from '@/components/medications/PrescriptionForm';
import { PeopleNavTabs }         from '@/components/people/PeopleNavTabs';
import { PeoplePageClient }      from '@/components/people/PeoplePageClient';
import { toSlug }                from '@/lib/utils/strings';
import { AnalyticsClient }       from '@/components/analytics/AnalyticsClient';
import { QuickLog }              from './QuickLog';
import { useDay }                from './DayContext';
import { createClient }          from '@/lib/supabase/client';
import { saveJournalResponses }  from '@/lib/dal/journal';
import type { Module }           from '@/types/schema';
import type { ModuleData }       from '@/lib/dal/modules';
import type { JournalState }     from '@/components/daily-log/DailyPageClient';

/** Names for the placement settings. */
export const MODULE_LABELS: Record<Module, string> = {
  TASK_LIST:             'Task list',
  TASK_QUICKADD:         'Quick task form',
  TASK_ADD:              'Task form (full)',
  APPOINTMENT_QUICKLIST: 'Upcoming appointments',
  APPOINTMENT_ADD:       'Appointment form',
  APPOINTMENT_LIST:      'Appointment list (full)',
  LAST_TIME:             'Last time list',
  NOW_PLAYING_LIST:      'Now playing (media)',
  MEDIA_ADD:             'Add media',
  MEDIA_LIST:            'Media list',
  BRAIN_DUMP_ADD:        'Brain dump form',
  BRAIN_DUMP_LIST:       'Brain dump list',
  DAILY_JOURNAL:         'Daily journal',
  WEEKLY_JOURNAL:        'Weekly journal',
  QUICK_LOG:             'Log something (shortcuts)',
  PRESCRIPTION_LIST:     'Medication list',
  PRESCRIPTION_ADD:      'Medication form',
  PEOPLE_LIST:           'People',
  ANALYTICS_LIST:        'Charts',
};

// ── Glue for forms that open in a dialog on their own page ──────────────────

function DialogButton({ label, children }: Readonly<{
  label:    string;
  children: (open: boolean, setOpen: (open: boolean) => void) => ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>{label}</Button>
      {children(open, setOpen)}
    </>
  );
}

// ── Daily journal: the daily page's Journal tab, saving on its own ───────────

function DailyJournal({ data }: Readonly<{ data: NonNullable<ModuleData['dailyJournal']> }>) {
  const day = useDay();
  const [state, setState] = useState<JournalState>(() => data.responses.map((r, i) => ({
    clientId: `loaded-${i}`, categoryId: r.category_id, promptId: r.prompt_id,
    promptText: r.prompt_text, responseText: r.response_text ?? '', dbId: r.id,
  })));
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const save = async () => {
    setSaveState('saving');
    try {
      await saveJournalResponses(createClient(), await day.getEntryId(), state.map(c => ({
        promptId: c.promptId, responseText: c.responseText, dbId: c.dbId,
      })));
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
    }
  };

  return <JournalTab mode={day.mode} categories={data.categories} state={state} setState={setState}
    onSave={save} saveState={saveState} />;
}

// ── The map ──────────────────────────────────────────────────────────────────

interface ViewProps {
  data:    ModuleData;
  /** Called after a form saves (e.g. so the Quick add sheet can close). */
  onDone?: (message: string) => void;
  /** In the Quick add sheet: forms that can drop their card do. */
  inSheet?: boolean;
}

const missing = <EmptyState>Couldn&apos;t load this.</EmptyState>;

const MODULE_VIEWS: Record<Module, (p: ViewProps) => ReactNode> = {
  TASK_LIST: ({ data }) => data.tasks
    ? <TaskList contextDate={data.date} initialData={data.tasks} />
    : missing,

  TASK_QUICKADD: ({ data, onDone }) =>
    <QuickAddTaskForm minimal contextDate={data.date} onAdded={onDone && (() => onDone('Task added'))} />,

  TASK_ADD: ({ data, onDone }) => (
    <DialogButton label="+ New task">
      {(open, setOpen) => (
        <TaskDialog open={open} onOpenChange={setOpen} showDateShortcuts contextDate={data.date}
          onSaved={onDone && (() => onDone('Task added'))} />
      )}
    </DialogButton>
  ),

  APPOINTMENT_QUICKLIST: ({ data }) => data.upcomingAppointments
    ? <UpcomingAppointments appointments={data.upcomingAppointments} contextDate={data.date} />
    : missing,

  APPOINTMENT_ADD: ({ data, onDone }) => data.appointmentRefs ? (
    <DialogButton label="+ New appointment">
      {(open, setOpen) => (
        <AppointmentDialog open={open} onOpenChange={setOpen}
          appointmentTypes={data.appointmentRefs!.types} people={data.appointmentRefs!.people}
          providers={data.appointmentRefs!.providers}
          onCreated={onDone && (() => onDone('Appointment added'))} />
      )}
    </DialogButton>
  ) : missing,

  APPOINTMENT_LIST: ({ data }) => data.appointments && data.appointmentRefs
    ? <AppointmentsClient upcoming={data.appointments.upcoming} past={data.appointments.past}
        appointmentTypes={data.appointmentRefs.types} people={data.appointmentRefs.people}
        providers={data.appointmentRefs.providers} />
    : missing,

  LAST_TIME: ({ data }) => data.lastTime
    ? <LastTimeTracker entries={data.lastTime} icons={data.icons ?? []} />
    : missing,

  NOW_PLAYING_LIST: ({ data }) => data.inProgressMedia && data.media
    ? <QuickMediaLog initialEntries={data.inProgressMedia} mediaTypes={data.media.types}
        mediaStatuses={data.media.statuses} statusTypeLinks={data.media.statusTypeLinks} open />
    : missing,

  MEDIA_ADD: ({ data }) => data.media ? (
    <DialogButton label="+ Add media">
      {(open, setOpen) => (
        <MediaDialog open={open} onOpenChange={setOpen}
          defaultTypeId={data.media!.types[0] ? String(data.media!.types[0].id) : ''}
          startInProgress mediaTypes={data.media!.types} mediaStatuses={data.media!.statuses}
          statusTypeLinks={data.media!.statusTypeLinks} />
      )}
    </DialogButton>
  ) : missing,

  MEDIA_LIST: ({ data }) => data.mediaEntries && data.media
    ? <MediaClient entries={data.mediaEntries} mediaTypes={data.media.types}
        mediaStatuses={data.media.statuses} statusTypeLinks={data.media.statusTypeLinks} />
    : missing,

  BRAIN_DUMP_ADD: ({ data, onDone, inSheet }) =>
    <BrainDumpForm dumpDate={data.date} bare={inSheet} compact={inSheet}
      onSaved={onDone && (() => onDone('Brain dump saved'))} />,

  BRAIN_DUMP_LIST: () => <BrainDumpList />,

  DAILY_JOURNAL: ({ data }) => data.dailyJournal ? <DailyJournal data={data.dailyJournal} /> : missing,

  WEEKLY_JOURNAL: ({ data }) => data.weeklyJournal
    ? <WeeklyJournalClient weekStart={data.weeklyJournal.weekStart} weekNum={data.weeklyJournal.weekNum}
        weekRange={data.weeklyJournal.weekRange} existingEntry={data.weeklyJournal.entry}
        categories={data.weeklyJournal.categories} responses={data.weeklyJournal.responses} />
    : missing,

  QUICK_LOG: ({ data, onDone }) => data.dailySections
    ? <QuickLog date={data.date} sections={data.dailySections} onNavigate={onDone && (() => onDone(''))} />
    : missing,

  PRESCRIPTION_LIST: ({ data }) => data.prescriptionsByPerson
    ? <PrescriptionsClient prescriptionsByPerson={data.prescriptionsByPerson} />
    : missing,

  PRESCRIPTION_ADD: () => (
    <DialogButton label="+ New medication">
      {(open, setOpen) => <PrescriptionDialog open={open} onOpenChange={setOpen} />}
    </DialogButton>
  ),

  // As /people: the people tabs, then your own page.
  PEOPLE_LIST: ({ data }) => data.people ? (
    <>
      <PeopleNavTabs people={data.people.people} categories={data.people.categories}
        currentSlug={data.people.self ? toSlug(data.people.self.person.person_name) : ''}
        initialCategory={data.people.self?.person.category_id ?? null} />
      {data.people.self && <PeoplePageClient data={data.people.self} peopleCategories={data.people.categories} />}
    </>
  ) : missing,

  ANALYTICS_LIST: ({ data }) => data.analytics
    ? <AnalyticsClient charts={data.analytics.charts} data={data.analytics.data}
        fromDate={data.analytics.fromDate} toDate={data.analytics.toDate} icons={data.icons ?? []} />
    : missing,
};

export function ModuleView({ module, data, onDone, inSheet }: Readonly<{
  module:   Module;
  data:     ModuleData;
  onDone?:  (message: string) => void;
  inSheet?: boolean;
}>) {
  const View = MODULE_VIEWS[module];
  return <>{View({ data, onDone, inSheet })}</>;
}
