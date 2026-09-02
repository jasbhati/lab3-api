import { Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  validateBody,
} from '../middleware/validation.js';
import { taskStore } from '../store/taskStore.js';
import { decodeCursor, encodeCursor } from '../utils/pagination.js';

export const tasksRouter = Router();

tasksRouter.get('/', (request, response, next) => {
  const parsedQuery = listTasksQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    next(parsedQuery.error);
    return;
  }

  const { limit, cursor } = parsedQuery.data;
  let afterId: string | undefined;

  if (cursor) {
    afterId = decodeCursor(cursor);

    if (!taskStore.findById(afterId)) {
      next(new AppError(400, 'INVALID_CURSOR', 'Cursor is invalid or expired'));
      return;
    }
  }

  const { items, hasMore } = taskStore.findPage({ limit, afterId });
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.id) : null;

  response.json({ data: items, nextCursor, hasMore });
});

tasksRouter.get<{ id: string }>('/:id', (request, response, next) => {
  const task = taskStore.findById(request.params.id);

  if (!task) {
    next(new AppError(404, 'TASK_NOT_FOUND', `Task ${request.params.id} not found`));
    return;
  }

  response.json(task);
});

tasksRouter.post('/', validateBody(createTaskSchema), (request, response) => {
  const task = taskStore.create(request.body);
  response.status(201).json(task);
});

tasksRouter.put<{ id: string }>('/:id', validateBody(updateTaskSchema), (request, response, next) => {
  const task = taskStore.update(request.params.id, request.body);

  if (!task) {
    next(new AppError(404, 'TASK_NOT_FOUND', `Task ${request.params.id} not found`));
    return;
  }

  response.json(task);
});

tasksRouter.delete<{ id: string }>('/:id', (request, response, next) => {
  if (!taskStore.delete(request.params.id)) {
    next(new AppError(404, 'TASK_NOT_FOUND', `Task ${request.params.id} not found`));
    return;
  }

  response.status(204).send();
});