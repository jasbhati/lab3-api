import { Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import {
  createTaskSchema,
  updateTaskSchema,
  validateBody,
} from '../middleware/validation.js';
import { taskStore } from '../store/taskStore.js';

export const tasksRouter = Router();

tasksRouter.get('/', (_request, response) => {
  response.json(taskStore.findAll());
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