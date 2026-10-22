"use client";

/**
 * Task forms.
 *
 *   TaskDialog        — the full form in a FormDialog; adds or edits a task
 *                       and saves it (task page Edit, task list ＋).
 *   QuickAddTaskForm  — title + date (+ time, person) quick add, no card
 *                       (the phone ＋ sheet).
 */

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  CardActions,
  CardSection,
  CardSectionLabel,
  FormDialog,
  TextField,
  NumberField,
  DateField,
  TimeField,
  DateTimeField,
  TextAreaField,
  SelectField,
  Toggle,
  useToast, ChipSelect, FieldActions, FieldGrid, InputField,
} from "@/components/ui";
import type { TaskDetail } from "@/types/dal";
import type { TaskRow } from "@/types/schema";
import { addDays, localTodayISO, toLocalInput } from "@/lib/utils/dates";
import { WEEKDAYS } from "@/lib/constants/dates";
import { createClient } from "@/lib/supabase/client";
import { createTask, updateTask } from "@/lib/dal/tasks";
import { useRouter } from "next/navigation";
import { usePeople, useTaskDefaults, useTaskPriorities, useTaskStatuses } from "@/lib/hooks/reference";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TaskFormValues {
  title: string;
  status_id: string;
  priority_id: string;
  due_date: string;
  due_time: string;
  person_id: string;
  body_md: string;
  reminder_at: string;
  recurrence_frequency: string;
  recurrence_interval: string;
  recurrence_days: string;
  recurrence_end_date: string;
}

/** Convenience helper — start from empty values with optional overrides. */
export function emptyTaskFormValues(
  overrides: Partial<TaskFormValues> = {},
): TaskFormValues {
  return {
    title: "",
    status_id: "",
    priority_id: "",
    due_date: "",
    due_time: "",
    person_id: "",
    body_md: "",
    reminder_at: "",
    recurrence_frequency: "",
    recurrence_interval: "1",
    recurrence_days: "",
    recurrence_end_date: "",
    ...overrides,
  };
}

const FREQUENCY_UNIT: Record<string, string> = {
  daily: "day(s)",
  weekly: "week(s)",
  monthly: "month(s)",
  yearly: "year(s)",
};

// ── Payload helpers ───────────────────────────────────────────────────────────

/** Form values for an existing task. */
export function taskToFormValues(task: TaskDetail): TaskFormValues {
  return {
    title:                task.title,
    status_id:            String(task.status_id),
    priority_id:          String(task.priority_id),
    due_date:             task.due_date  ?? '',
    due_time:             task.due_time  ?? '',
    person_id:            task.person_id ? String(task.person_id) : '',
    body_md:              task.body_md   ?? '',
    reminder_at:          task.reminder_at ? toLocalInput(task.reminder_at) : '',
    recurrence_frequency: task.recurrence_frequency ?? '',
    recurrence_interval:  String(task.recurrence_interval ?? 1),
    recurrence_days:      task.recurrence_days      ?? '',
    recurrence_end_date:  task.recurrence_end_date  ?? '',
  };
}

/** The task columns the form edits, ready for createTask / updateTask. */
function taskPayload(values: TaskFormValues) {
  const reminder = values.reminder_at
    ? {
        // The input gives local wall-clock time ("2026-10-22T09:00");
        // store it as a real instant so it isn't read as UTC.
        reminder_at:          new Date(values.reminder_at).toISOString(),
        recurrence_frequency: (values.recurrence_frequency || null) as TaskRow['recurrence_frequency'],
        recurrence_interval:  values.recurrence_interval ? Number.parseInt(values.recurrence_interval) : null,
        recurrence_days:      values.recurrence_days     || null,
        recurrence_end_date:  values.recurrence_end_date || null,
      }
    : {
        reminder_at:          null,
        recurrence_frequency: null,
        recurrence_interval:  null,
        recurrence_days:      null,
        recurrence_end_date:  null,
      };
  return {
    title:       values.title.trim(),
    status_id:   Number.parseInt(values.status_id),
    priority_id: Number.parseInt(values.priority_id),
    due_date:    values.due_date || null,
    due_time:    values.due_time || null,
    person_id:   values.person_id ? Number.parseInt(values.person_id) : null,
    body_md:     values.body_md  || null,
    ...reminder,
  };
}

// ── TaskDialog ────────────────────────────────────────────────────────────────

/**
 * Add or edit a task in a FormDialog. With `task` it edits that task;
 * without, it creates one (starting from `defaults`). Saves itself and
 * refreshes the page.
 */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaults,
  showDateShortcuts = false,
  contextDate,
  onSaved,
}: Readonly<{
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  /** The task to edit; omit to add a new one. */
  task?:         TaskDetail | null;
  /** Starting values for a new task. */
  defaults?:     Partial<TaskFormValues>;
  /** "Tomorrow" / "Next week" buttons under the due date (relative to contextDate). */
  showDateShortcuts?: boolean;
  contextDate?:  string;
  onSaved?:      () => void;
}>) {
  const supabase = createClient();
  const router   = useRouter();
  const showStatus = Boolean(task);
  const initialValues = task ? taskToFormValues(task) : emptyTaskFormValues(defaults);

  const [form, setForm] = useState<TaskFormValues>(initialValues);
  const set = (k: keyof TaskFormValues, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const { data: statuses = [], isLoading: statusesLoading, error: statusesError } = useTaskStatuses();
  const { data: priorities = [], isLoading: prioritiesLoading, error: prioritiesError } = useTaskPriorities();
  const { data: people = [], isLoading: peopleLoading, error: peopleError } = usePeople();
  const { addToast } = useToast();
  useEffect(() => { if (statusesError)      addToast('Failed to load task statuses', 'error'); },   [statusesError,       addToast]);
  useEffect(() => { if (prioritiesError)    addToast('Failed to load task priorities', 'error'); }, [prioritiesError,     addToast]);
  useEffect(() => { if (peopleError)        addToast('Failed to load people', 'error'); },          [peopleError,         addToast]);
  const referenceLoading = peopleLoading || prioritiesLoading || (showStatus && statusesLoading);

  const hasReminder = Boolean(form.reminder_at);
  const [addReminder, toggleAddReminder] = useState(hasReminder);

  // Each open starts from the record (or the defaults) again.
  useEffect(() => {
    if (!open) return;
    setForm(initialValues);
    toggleAddReminder(Boolean(initialValues.reminder_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const activeDays = form.recurrence_days
    ? form.recurrence_days.split(",").filter(Boolean)
    : [];

  const clearReminder = () => {
    set("reminder_at", "");
    set("recurrence_frequency", "");
    set("recurrence_days", "");
    set("recurrence_end_date", "");
  };

  const toggleDay = (code: string) => {
    const next = activeDays.includes(code)
      ? activeDays.filter((d) => d !== code)
      : [...activeDays, code];
    set("recurrence_days", next.join(","));
  };

  // Auto-fill reminder_at from due_date when reminder is not yet set
  useEffect(() => {
    if (!form.reminder_at && form.due_date && addReminder) {
      set(
        "reminder_at",
        form.due_date + (form.due_time ? "T" + form.due_time : "T12:00:00"),
      );
    } else if (!addReminder) {
      set("reminder_at", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.due_date, addReminder]);

  const save = async () => {
    const payload = taskPayload(form);
    if (task) {
      await updateTask(supabase, task.id, { ...payload, snoozed_until: null, reminder_last_sent: null });
    } else {
      await createTask(supabase, { ...payload, completed_at: null });
    }
    router.refresh();
    onSaved?.();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={task ? 'Edit task' : 'Add task'}
      saveLabel={task ? 'Save' : 'Add'}
      canSave={Boolean(form.title.trim()) && !referenceLoading}
      onSave={save}
    >
      <CardSection>
        <CardSectionLabel>Details</CardSectionLabel>

        <TextField label="Title" value={form.title} onChange={(v) => set("title", v)} autoFocus={!task} />

        <FieldGrid>
          {showStatus && statuses && (
            <SelectField
              label="Status"
              value={form.status_id}
              disabled={statusesLoading}
              onChange={(v) => set("status_id", v)}
              options={statuses.map((s) => ({ value: s.id, label: s.status_name }))}
            />
          )}
          <SelectField
            label="Priority"
            value={form.priority_id}
            disabled={prioritiesLoading}
            onChange={(v) => set("priority_id", v)}
            options={priorities.map((p) => ({ value: p.id, label: p.priority_name }))}
          />
          <SelectField
            label="For"
            value={form.person_id}
            disabled={peopleLoading}
            onChange={(v) => set("person_id", v)}
            placeholder="Anyone"
            options={people.map((p) => ({ value: p.id, label: p.person_name }))}
          />
        </FieldGrid>

        <FieldGrid>
          <DateField label="Due date" value={form.due_date} onChange={(v) => set("due_date", v)} />
          <TimeField label="Time" value={form.due_time} onChange={(v) => set("due_time", v)} />
        </FieldGrid>

        {showDateShortcuts && contextDate && (
          <FieldActions boxed>
            <Button
              size="sm"
              variant="action"
              onClick={() => set("due_date", addDays(contextDate, 1))}
            >
              Tomorrow
            </Button>
            <Button
              size="sm"
              variant="action"
              onClick={() => set("due_date", addDays(contextDate, 7))}
            >
              Next week
            </Button>
          </FieldActions>
        )}

        <TextAreaField label="Notes" value={form.body_md} onChange={(v) => set("body_md", v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Reminders and Recurrences</CardSectionLabel>
        <Toggle
          label={"Add Reminder"}
          checked={addReminder}
          onChange={() => toggleAddReminder(!addReminder)}
        />

        {(addReminder || hasReminder) && (
          <FieldGrid>
            <DateTimeField
              label="Reminder"
              value={form.reminder_at}
              onChange={(v) => {
                set("reminder_at", v);
                if (!v) clearReminder();
              }}
            />
            {addReminder && hasReminder && (
              <SelectField
                label="Repeat"
                value={form.recurrence_frequency}
                onChange={(v) => {
                  set("recurrence_frequency", v);
                  set("recurrence_days", "");
                }}
                placeholder="No repeat"
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                ]}
              />
            )}
          </FieldGrid>
        )}

        {addReminder && hasReminder && form.recurrence_frequency && (
          <>
            <FieldGrid>
              <NumberField
                label={`Every … ${FREQUENCY_UNIT[form.recurrence_frequency]}`}
                min="1"
                max="99"
                value={form.recurrence_interval}
                onChange={(v) => set("recurrence_interval", v)}
              />
              <DateField
                label="Until (optional)"
                value={form.recurrence_end_date}
                onChange={(v) => set("recurrence_end_date", v)}
              />
            </FieldGrid>
            {form.recurrence_frequency === "weekly" && (
              <InputField label="On">
                <ChipSelect
                  label="Repeat on"
                  options={WEEKDAYS.map(({ code, label }) => ({ value: code, label }))}
                  selected={activeDays}
                  onToggle={code => toggleDay(code)}
                />
              </InputField>
            )}
          </>
        )}

        {hasReminder && (
          <FieldActions alignment="right">
            {form.recurrence_end_date && (
              <Button size="sm" variant="ghost" onClick={() => set("recurrence_end_date", "")}>
                ✕ No end date
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { clearReminder(); toggleAddReminder(false); }}>
              ✕ Clear reminder
            </Button>
          </FieldActions>
        )}
      </CardSection>
    </FormDialog>
  );
}

// ── QuickAddTaskForm ─────────────────────────────────────────────────────────

/**
 * The quick-add task fields + "+ Quick" button, without a card around them.
 * Used by the mobile Quick add sheet.
 *
 *   minimal      — title, date and the date shortcuts only (no time, no person)
 *   onAdded      — called after a task is created (and the page refreshed)
 */
export function QuickAddTaskForm({
  contextDate = localTodayISO(),
  defaultDue = '',
  minimal = false,
  onAdded,
}: Readonly<{
  contextDate?:  string;
  /** Due date the form starts with (and returns to after each add), e.g. the
   *  daily page's date. Default: none. */
  defaultDue?:   string;
  minimal?:      boolean;
  onAdded?:      () => void;
}>) {
  const supabase = createClient();
  const router = useRouter();

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState(defaultDue);
  const [newTime, setNewTime] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [adding, setAdding] = useState(false);

  const {
    statusId: todoStatusId, priorityId: normalPriorityId,
    isLoading: defaultsLoading, error: defaultsError,
  } = useTaskDefaults();
  const { data: people = [], isLoading: peopleLoading, error: peopleError } = usePeople();
  const { addToast } = useToast();
  useEffect(() => { if (defaultsError) addToast('Failed to load task statuses/priorities', 'error'); }, [defaultsError, addToast]);
  useEffect(() => { if (peopleError)   addToast('Failed to load people', 'error'); },                    [peopleError,   addToast]);
  const referenceLoading = peopleLoading || defaultsLoading;

  const quickAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createTask(supabase, {
        title: newTitle.trim(),
        status_id: todoStatusId,
        priority_id: normalPriorityId,
        due_date: newDue || null,
        due_time: newTime || null,
        person_id: newPerson ? Number.parseInt(newPerson) : null,
        body_md: null,
        completed_at: null,
      });
      setNewTitle("");
      setNewDue(defaultDue);
      setNewTime("");
      router.refresh();
      onAdded?.();
    } catch {
      addToast("Couldn’t add the task", "error");
    } finally {
      setAdding(false);
    }
  }, [
    supabase,
    newTitle,
    newDue,
    newTime,
    newPerson,
    defaultDue,
    todoStatusId,
    normalPriorityId,
    router,
    onAdded,
    addToast,
  ]);

  return (
    <>
      <CardActions>
        <Button
          variant="action-alt"
          onClick={quickAdd}
          busy={adding} disabled={!newTitle.trim() || referenceLoading}
        >
          + Quick
        </Button>
      </CardActions>
      <TextField
        label="Title"
        value={newTitle}
        onChange={setNewTitle}
        onKeyDown={(e) => e.key === "Enter" && quickAdd()}
        placeholder="Quick add task…"
      />
      {minimal ? (
        <DateField label="Date" value={newDue} onChange={setNewDue} />
      ) : (
        <FieldGrid>
          <DateField label="Date" value={newDue} onChange={setNewDue} />
          <TimeField label="Time" value={newTime} onChange={setNewTime} />
        </FieldGrid>
      )}
      <FieldActions boxed>
        <Button
          size="sm"
          variant="action"
          onClick={() => setNewDue(addDays(contextDate, 1))}
        >
          Tomorrow
        </Button>
        <Button
          size="sm"
          variant="action"
          onClick={() => setNewDue(addDays(contextDate, 7))}
        >
          Next week
        </Button>
      </FieldActions>
      {!minimal && (
        <SelectField
          label="For"
          value={newPerson}
          disabled={peopleLoading}
          onChange={setNewPerson}
          placeholder="Anyone"
          options={people.map((p) => ({ value: p.id, label: p.person_name }))}
          className="input--narrow"
        />
      )}
    </>
  );
}
