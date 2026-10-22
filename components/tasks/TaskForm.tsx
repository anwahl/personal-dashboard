"use client";

/**
 * Owns its own form state internally; calls onSave(values) on submit.
 * The parent is responsible for the async save operation and for
 * passing back `saving` / `saveState` while the operation is in flight.
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardSection,
  CardSectionLabel,
  CardTitle,
  ExpandCard,
  TextField,
  NumberField,
  DateField,
  TimeField,
  DateTimeField,
  TextAreaField,
  SelectField,
  SaveStatus,
  Toggle,
  useToast, ChipSelect, FieldActions, FieldGrid,
} from "@/components/ui";
import type { SaveState } from "@/components/ui";
import type { TaskStatusRow, TaskPriorityRow } from "@/types/dal";
import type { PersonRow, TaskRow } from "@/types/schema";
import {
  addDays,
  localISODateFromDateString,
  localTodayISO,
} from "@/lib/utils/dates";
import { WEEKDAYS } from "@/lib/constants/dates";
import { createClient } from "@/lib/supabase/client";
import { createTask } from "@/lib/dal/tasks";
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

// ── TaskForm ──────────────────────────────────────────────────────────────────

interface TaskFormProps {
  initialValues: TaskFormValues;
  showStatus?: boolean;
  showDateShortcuts?: boolean;
  contextDate?: string;
  saving: boolean;
  saveState?: SaveState;
  saveLabel?: string;
  onSave: (values: TaskFormValues) => void;
  onCancel: () => void;
}

export function TaskForm({
  initialValues,
  showStatus = false,
  showDateShortcuts = false,
  contextDate,
  saving,
  saveState,
  saveLabel = "Save",
  onSave,
  onCancel,
}: Readonly<TaskFormProps>) {
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

  return (
    <CardBody>
      <CardSection>
        <CardSectionLabel>Details</CardSectionLabel>

        <TextField label="Title" value={form.title} onChange={(v) => set("title", v)} autoFocus />

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
          <div className="reminder-section__row">
            <span className="reminder-section__label">Reminder</span>
            <DateTimeField
              hideLabel
              label="Reminder"
              value={form.reminder_at}
              onChange={(v) => {
                set("reminder_at", v);
                if (!v) clearReminder();
              }}
            />
            {hasReminder && (
              <Button size="sm" variant="ghost" onClick={clearReminder}>
                ✕ Clear
              </Button>
            )}
          </div>
        )}

        {addReminder && hasReminder && (
          <div className="reminder-section__fields">
            <div className="reminder-section__row">
              <span className="reminder-section__label">Repeat</span>
              <SelectField
                hideLabel
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
            </div>

            {form.recurrence_frequency && (
              <>
                <div className="reminder-section__row">
                  <span className="reminder-section__label">Every</span>
                  <NumberField
                    hideLabel
                    label="Repeat every"
                    min="1"
                    max="99"
                    className="reminder-section__interval"
                    value={form.recurrence_interval}
                    onChange={(v) => set("recurrence_interval", v)}
                  />
                  <span className="reminder-section__unit">
                    {FREQUENCY_UNIT[form.recurrence_frequency]}
                  </span>
                </div>

                {form.recurrence_frequency === "weekly" && (
                  <div className="reminder-section__row">
                    <span className="reminder-section__label">On</span>
                    <ChipSelect
                      label="Repeat on"
                      options={WEEKDAYS.map(({ code, label }) => ({ value: code, label }))}
                      selected={activeDays}
                      onToggle={code => toggleDay(code)}
                    />
                  </div>
                )}

                <div className="reminder-section__row">
                  <span className="reminder-section__label">Until</span>
                  <DateField
                    hideLabel
                    label="Repeat until"
                    value={form.recurrence_end_date}
                    onChange={(v) => set("recurrence_end_date", v)}
                  />
                  {form.recurrence_end_date && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => set("recurrence_end_date", "")}
                      aria-label="Clear end date"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardSection>

      <FieldActions docked alignment="right">
        <Button
          variant="accent"
          onClick={() => onSave(form)}
          busy={saving} disabled={!form.title.trim() || referenceLoading}
        >
          {saveLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {saveState && <SaveStatus state={saveState} />}
      </FieldActions>
    </CardBody>
  );
}

// ── QuickAddTaskForm ─────────────────────────────────────────────────────────

/**
 * The quick-add task fields + "+ Quick" button, without a card around them.
 * Used inside QuickAdd (Tasks page / Hub) and the mobile Quick add sheet.
 *
 *   minimal      — title, date and the date shortcuts only (no time, no person)
 *   extraActions — rendered beside "+ Quick" (QuickAdd passes "Full Add")
 *   onAdded      — called after a task is created (and the page refreshed)
 */
export function QuickAddTaskForm({
  contextDate = localTodayISO(),
  defaultDue = '',
  minimal = false,
  extraActions,
  onAdded,
}: Readonly<{
  contextDate?:  string;
  /** Due date the form starts with (and returns to after each add), e.g. the
   *  daily page's date. Default: none. */
  defaultDue?:   string;
  minimal?:      boolean;
  extraActions?: ReactNode;
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
        {extraActions}
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

// ── QuickAdd ──────────────────────────────────────────────────────────────────

/** Collapsible "Add Task" card: QuickAddTaskForm, plus a toggle to the full TaskForm. */
export function QuickAdd({
  contextDate = localTodayISO(),
  defaultDue = '',
}: Readonly<{
  contextDate?: string;
  /** Due date new tasks start with (e.g. the daily page's date). */
  defaultDue?:  string;
}>) {
  const supabase = createClient();
  const router = useRouter();

  const [showFull, setShowFull] = useState(false);
  const [saving, setSaving] = useState(false);

  const { statusId: todoStatusId, priorityId: normalPriorityId } = useTaskDefaults();

  // ── Full add (via TaskForm) ──────────────────────────────────────────────
  const fullAdd = useCallback(
    async (values: TaskFormValues) => {
      setSaving(true);
      try {
        const reminderPayload = values.reminder_at
          ? {
              reminder_at: localISODateFromDateString(values.reminder_at),
              recurrence_frequency: (values.recurrence_frequency ||
                null) as TaskRow["recurrence_frequency"],
              recurrence_interval: values.recurrence_interval
                ? Number.parseInt(values.recurrence_interval)
                : null,
              recurrence_days: values.recurrence_days || null,
              recurrence_end_date: values.recurrence_end_date || null,
            }
          : {
              reminder_at: null,
              recurrence_frequency: null,
              recurrence_interval: null,
              recurrence_days: null,
              recurrence_end_date: null,
            };

        await createTask(supabase, {
          title: values.title.trim(),
          status_id: Number.parseInt(values.status_id),
          priority_id: Number.parseInt(values.priority_id),
          due_date: values.due_date || null,
          due_time: values.due_time || null,
          person_id: values.person_id
            ? Number.parseInt(values.person_id)
            : null,
          body_md: values.body_md || null,
          completed_at: null,
          ...reminderPayload,
        });
        setShowFull(false);
        router.refresh();
      } finally {
        setSaving(false);
      }
    },
    [supabase, router],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  if (showFull) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Task</CardTitle>
        </CardHeader>
        <TaskForm
          initialValues={emptyTaskFormValues({
            status_id: String(todoStatusId),
            priority_id: String(normalPriorityId),
            due_date: defaultDue,
          })}
          showDateShortcuts
          contextDate={contextDate}
          saving={saving}
          saveLabel="Add Task"
          onSave={fullAdd}
          onCancel={() => setShowFull(false)}
        />
      </Card>
    );
  }

  return (
    <ExpandCard title='Add Task'
      hiddenChildren={
        <QuickAddTaskForm
          contextDate={contextDate}
          defaultDue={defaultDue}
          extraActions={
            <Button variant="action-alt" onClick={() => setShowFull(true)}>
              Full Add
            </Button>
          }
        />
      } />
  );
}
