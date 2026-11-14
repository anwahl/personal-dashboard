import { createRoute } from '@hono/zod-openapi'
import { createRouter } from '../lib/router.ts'
import { errorResponses, IdParamSchema, notFoundResponse } from '../schemas/common.ts'
import {
  TaskCreateSchema,
  TaskListQuerySchema,
  TaskListSchema,
  TaskSchema,
  TaskUpdateSchema,
} from '../schemas/tasks.ts'
import { createTask, deleteTask, getTask, listTasks, updateTask } from '../services/tasks.ts'

export const taskRoutes = createRouter()

const json = <T>(schema: T) => ({ 'application/json': { schema } })

taskRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/tasks',
    tags: ['tasks'],
    summary: 'Filtered, sorted page of tasks',
    request: { query: TaskListQuerySchema },
    responses: {
      200: { description: 'OK', content: json(TaskListSchema) },
      ...errorResponses,
    },
  }),
  async (c) => c.json(await listTasks(c.req.valid('query')), 200),
)

taskRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/tasks/{id}',
    tags: ['tasks'],
    summary: 'One task',
    request: { params: IdParamSchema },
    responses: {
      200: { description: 'OK', content: json(TaskSchema) },
      ...errorResponses,
      ...notFoundResponse,
    },
  }),
  async (c) => c.json(await getTask(c.req.valid('param').id), 200),
)

taskRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/tasks',
    tags: ['tasks'],
    summary: 'Create a task',
    request: { body: { required: true, content: json(TaskCreateSchema) } },
    responses: {
      201: { description: 'Created', content: json(TaskSchema) },
      ...errorResponses,
    },
  }),
  async (c) => c.json(await createTask(c.req.valid('json')), 201),
)

taskRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/tasks/{id}',
    tags: ['tasks'],
    summary: 'Change some fields of a task',
    request: { params: IdParamSchema, body: { required: true, content: json(TaskUpdateSchema) } },
    responses: {
      200: { description: 'OK', content: json(TaskSchema) },
      ...errorResponses,
      ...notFoundResponse,
    },
  }),
  async (c) => c.json(await updateTask(c.req.valid('param').id, c.req.valid('json')), 200),
)

taskRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/tasks/{id}',
    tags: ['tasks'],
    summary: 'Delete a task',
    request: { params: IdParamSchema },
    responses: {
      204: { description: 'Deleted' },
      ...errorResponses,
      ...notFoundResponse,
    },
  }),
  async (c) => {
    await deleteTask(c.req.valid('param').id)
    return c.body(null, 204)
  },
)
