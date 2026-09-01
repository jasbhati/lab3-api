import { afterEach, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { CreateTaskInput, Task } from '../src/models/task.js';
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

beforeEach(() => {
  taskStore.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});