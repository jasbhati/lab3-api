import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, z } from 'zod';
import { taskStatuses } from '../models/task.js';

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(taskStatuses).optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000),
    status: z.enum(taskStatuses),
  })
  .strict();

export const listTasksQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((value) => (value === undefined ? 20 : Number(value)))
      .pipe(
        z
          .number()
          .int('Limit must be an integer')
          .min(1, 'Limit must be at least 1')
          .max(100, 'Limit must be at most 100'),
      ),
    cursor: z.string().min(1, 'Cursor must not be empty').optional(),
  })
  .strict();

export function validateBody(schema: AnyZodObject) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(result.error);
      return;
    }

    request.body = result.data;
    next();
  };
}