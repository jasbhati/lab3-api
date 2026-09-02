import { afterEach, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { CreateTaskInput, Task } from '../src/models/task.js';
import { rateLimiter } from '../src/middleware/rateLimiter.js';
import { taskStore } from '../src/store/taskStore.js';

export function api() {
  return request(app);
}

export async function createTask(overrides: Partial<CreateTaskInput> = {}): Promise<Task> {
  const response = await api()
    .post('/tasks')
    .send({
      title: 'Test task',
      description: 'Created by a test helper',
      ...overrides,
    })
    .expect(201);

  return response.body as Task;
}

export async function createTasks(count: number): Promise<Task[]> {
  const tasks: Task[] = [];

  for (let index = 0; index < count; index += 1) {
    // Sequential awaits preserve creation order for deterministic pagination assertions.
    // eslint-disable-next-line no-await-in-loop
    tasks.push(await createTask({ title: `Task ${index + 1}` }));
  }

  return tasks;
}

beforeEach(() => {
  taskStore.clear();
  rateLimiter.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});