"use client";

/**
 * Owns its own form state internally; calls onSave(values) on submit.
 * The parent is responsible for the async save operation and for
 * passing back `saving` / `saveState` while the operation is in flight.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardSection,
  CardSectionLabel,
  CardTitle,
  ExpandCard,
  InputField,
  SaveStatus,
  Toggle,
} from "@/components/ui";
import type { SaveState } from "@/components/ui";
import type { TaskStatusRow, TaskPriorityRow } from "@/types/dal";
import type { PersonRow, TaskRow } from "@/types/schema";
import {
  addDays,
  localISODateFromDateString,
  localTodayISO,
} from "@/lib/utils/dates";
import { FieldActions, FieldGrid } from "@/components/ui/Display";
import { WEEKDAYS } from "@/lib/constants/dates";
import { createClient } from "@/lib/supabase/client";
import { createTask } from "@/lib/dal/tasks";
import { useRouter } from "next/navigation";

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
  statuses?: TaskStatusRow[]; // only needed when showStatus is true
  priorities: TaskPriorityRow[];
  people: PersonRow[];
  /** Show the Status dropdown (edit mode). Hidden on add. */
  showStatus?: boolean;
  /** Show Tomorrow / Next-week date shortcuts (add mode). */
  showDateShortcuts?: boolean;
  contextDate?: string; // required when showDateShortcuts is true
  saving: boolean;
  saveState?: SaveState; // renders <SaveStatus> when provided
  saveLabel?: string;
  onSave: (values: TaskFormValues) => void;
  onCancel: () => void;
}

export function TaskForm({
  initialValues,
  statuses,
  priorities,
  people,
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

        <InputField label="Title" id="tf-title">
          <input
            id="tf-title"
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            autoFocus
          />
        </InputField>

        <FieldGrid>
          {showStatus && statuses && (
            <InputField label="Status" id="tf-status">
              <select
                id="tf-status"
                value={form.status_id}
                onChange={(e) => set("status_id", e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </InputField>
          )}
          <InputField label="Priority" id="tf-priority">
            <select
              id="tf-priority"
              value={form.priority_id}
              onChange={(e) => set("priority_id", e.target.value)}
            >
              {priorities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.priority_name}
                </option>
              ))}
            </select>
          </InputField>
          <InputField label="For" id="tf-person">
            <select
              id="tf-person"
              value={form.person_id}
              onChange={(e) => set("person_id", e.target.value)}
            >
              <option value="">Anyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.person_name}
                </option>
              ))}
            </select>
          </InputField>
        </FieldGrid>

        <FieldGrid>
          <InputField label="Due date" id="tf-due">
            <input
              id="tf-due"
              type="date"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </InputField>
          <InputField label="Time" id="tf-time">
            <input
              id="tf-time"
              type="time"
              value={form.due_time}
              onChange={(e) => set("due_time", e.target.value)}
            />
          </InputField>
        </FieldGrid>

        {showDateShortcuts && contextDate && (
          <FieldActions>
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

        <InputField label="Notes" id="tf-body">
          <textarea
            id="tf-body"
            value={form.body_md}
            onChange={(e) => set("body_md", e.target.value)}
          />
        </InputField>
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
            <input
              type="datetime-local"
              value={form.reminder_at}
              onChange={(e) => {
                set("reminder_at", e.target.value);
                if (!e.target.value) clearReminder();
              }}
            />
            {hasReminder && (
              <button
                type="button"
                className="reminder-section__toggle"
                onClick={clearReminder}
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        {addReminder && hasReminder && (
          <div className="reminder-section__fields">
            <div className="reminder-section__row">
              <span className="reminder-section__label">Repeat</span>
              <select
                value={form.recurrence_frequency}
                onChange={(e) => {
                  set("recurrence_frequency", e.target.value);
                  set("recurrence_days", "");
                }}
              >
                <option value="">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {form.recurrence_frequency && (
              <>
                <div className="reminder-section__row">
                  <span className="reminder-section__label">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    className="reminder-section__interval"
                    value={form.recurrence_interval}
                    onChange={(e) => set("recurrence_interval", e.target.value)}
                  />
                  <span className="reminder-section__unit">
                    {FREQUENCY_UNIT[form.recurrence_frequency]}
                  </span>
                </div>

                {form.recurrence_frequency === "weekly" && (
                  <div className="reminder-section__row">
                    <span className="reminder-section__label">On</span>
                    <div className="weekday-chips">
                      {WEEKDAYS.map(({ code, label }) => (
                        <button
                          key={code}
                          type="button"
                          className={`weekday-chip${activeDays.includes(code) ? " weekday-chip--active" : ""}`}
                          onClick={() => toggleDay(code)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="reminder-section__row">
                  <span className="reminder-section__label">Until</span>
                  <input
                    type="date"
                    value={form.recurrence_end_date}
                    onChange={(e) => set("recurrence_end_date", e.target.value)}
                  />
                  {form.recurrence_end_date && (
                    <button
                      type="button"
                      className="reminder-section__toggle"
                      onClick={() => set("recurrence_end_date", "")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardSection>

      <div className="page-actions">
        <Button
          variant="accent"
          onClick={() => onSave(form)}
          disabled={saving || !form.title.trim()}
        >
          {saving ? "Saving…" : saveLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {saveState && <SaveStatus state={saveState} />}
      </div>
    </CardBody>
  );
}

// ── QuickAdd ──────────────────────────────────────────────────────────────────

export function QuickAdd({
  statuses,
  priorities,
  people,
  contextDate = localTodayISO(),
}: Readonly<{
  statuses: TaskStatusRow[];
  priorities: TaskPriorityRow[];
  people: PersonRow[];
  contextDate?: string;
}>) {
  const supabase = createClient();
  const router = useRouter();

  const [showFull, setShowFull] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const defaultStatus = statuses.find((s) => !s.is_terminal) ?? statuses[0];
  const defaultPriority = [...priorities].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )[0];
  const todoStatusId = defaultStatus?.id ?? 0;
  const normalPriorityId = defaultPriority?.id ?? priorities[0]?.id ?? 0;

  // ── Quick (title + date only) ────────────────────────────────────────────
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
      setNewDue("");
      setNewTime("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }, [
    supabase,
    newTitle,
    newDue,
    newTime,
    newPerson,
    todoStatusId,
    normalPriorityId,
    router,
  ]);

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
          })}
          priorities={priorities}
          people={people}
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
    <ExpandCard title='Add Task'>
      <InputField label="Title" id="qa-title">
        <input
          id="qa-title"
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickAdd()}
          placeholder="Quick add task…"
        />
      </InputField>
      <FieldGrid>
        <InputField label="Date" id="qa-date">
          <input
            id="qa-date"
            type="date"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
          />
        </InputField>
        <InputField label="Time" id="qa-time">
          <input
            id="qa-time"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
          />
        </InputField>
      </FieldGrid>
      <FieldActions>
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
      <InputField label="For" id="qa-person">
        <select
          id="qa-person"
          value={newPerson}
          onChange={(e) => setNewPerson(e.target.value)}
          style={{ width: 110 }}
        >
          <option value="">Anyone</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.person_name}
            </option>
          ))}
        </select>
      </InputField>
      <FieldActions alignment="bottom">
        <Button
          variant="action-alt"
          onClick={quickAdd}
          disabled={adding || !newTitle.trim()}
        >
          {adding ? "…" : "+ Quick"}
        </Button>
        <Button variant="action-alt" onClick={() => setShowFull(true)}>
          Full Add
        </Button>
      </FieldActions>
    </ExpandCard>
  );
}
