import { z } from '@hono/zod-openapi'
import type { Database } from '../lib/database.types.ts'
import { optionalText, queryList, requiredText } from './common.ts'
import { PersonRefSchema } from './people.ts'

type Enums = Database['public']['Enums']

// The DB enums, mirrored here (the `satisfies` breaks the build if they drift).
export const TASK_STATUSES = ['to-do', 'in-progress', 'done', 'cancelled'] as const satisfies readonly Enums['task_status'][]
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const satisfies readonly Enums['task_priority'][]

/** Statuses that count as finished: they stamp completed_at and aren't "open". */
export const FINISHED = ['done', 'cancelled'] as const satisfies readonly Enums['task_status'][]

export const TaskStatusSchema = z.enum(TASK_STATUSES).openapi('TaskStatus')
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES).openapi('TaskPriority')

const isoDate = z.iso.date().openapi({ example: '2026-11-11' })
const isoTime = z.iso.time().openapi({ example: '14:30' })

// ── Responses ───────────────────────────────────────────────────────────────

export const TaskSchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    status: TaskStatusSchema,
    priority: TaskPrioritySchema,
    due_date: z.string().nullable(),
    due_time: z.string().nullable(),
    body_md: z.string().nullable(),
    completed_at: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    recurrence_frequency: z.string().nullable(),
    person: z.union([PersonRefSchema, z.null()]),
  })
  .openapi('Task')

export const TaskListSchema = z
  .object({
    items: z.array(TaskSchema),
    total: z.number().int(),
  })
  .openapi('TaskList')

// ── Requests ────────────────────────────────────────────────────────────────

export const TaskCreateSchema = z
  .object({
    title: requiredText,
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    due_date: isoDate.nullable().optional(),
    due_time: isoTime.nullable().optional(),
    body_md: optionalText.optional(),
    person_id: z.number().int().positive().nullable().optional(),
  })
  .openapi('TaskCreate')

export const TaskUpdateSchema = TaskCreateSchema.partial().openapi('TaskUpdate')

export const DATE_FILTERS = ['today', 'tomorrow', 'next_week', 'undated'] as const
export const STATUS_FILTERS = ['open', 'overdue', 'done', 'cancelled'] as const
export const TASK_SORTS = ['due', 'priority', 'created', 'title'] as const
export const SORT_DIRECTIONS = ['asc', 'desc'] as const

/**
 * Within a group the choices are OR'd; groups are AND'd; a missing group
 * doesn't filter. Relative dates are relative to `context_date`.
 */
export const TaskListQuerySchema = z.object({
  date: queryList(z.enum(DATE_FILTERS)).optional().openapi({
    description: 'today = due on or before context_date (includes overdue); next_week = context_date +1…+7',
  }),
  custom_from: isoDate.optional().openapi({
    description: 'Custom date in the date group (OR\'d with `date`): due on or after this day. Pair with custom_to.',
  }),
  custom_to: isoDate.optional().openapi({
    description: 'Custom date in the date group: due on or before this day. Same as custom_from for a single day.',
  }),
  search_from: isoDate.optional().openapi({
    description: 'Date found in the search text (AND\'d with everything else): due on or after this day',
  }),
  search_to: isoDate.optional().openapi({ description: 'Date found in the search text: due on or before this day' }),
  status: queryList(z.enum(STATUS_FILTERS)).optional().openapi({
    description: 'open = not done/cancelled; overdue = open and due before context_date (or on it, before `now`)',
  }),
  priority: queryList(TaskPrioritySchema).optional(),
  q: z.string().trim().max(200).optional().openapi({ description: 'Title contains (case-insensitive)' }),
  sort: z.enum(TASK_SORTS).default('due'),
  dir: z.enum(SORT_DIRECTIONS).optional().openapi({
    description:
      "Sort direction. Default per sort: due asc (soonest first), priority desc (high first), created desc (newest first), title asc. Undated tasks always go last.",
  }),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  context_date: isoDate.openapi({ description: "The day the list is about (a journal page's date, or today)" }),
  now: isoTime.optional().openapi({
    description: 'Current local time; send only when context_date is today, so timed tasks earlier today count as overdue',
  }),
})

export type TaskStatus = z.infer<typeof TaskStatusSchema>
export type TaskCreate = z.infer<typeof TaskCreateSchema>
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>
