import { describe, expect, it } from '@jest/globals';
import { api, createTask } from './setup.js';

describe('Task API', () => {
  describe('GET /tasks', () => {
    it('returns all tasks', async () => {
      const task = await createTask();
      const response = await api().get('/tasks').expect(200);

      expect(response.body).toEqual([task]);
    });

    it('returns an empty array when no tasks exist', async () => {
      const response = await api().get('/tasks').expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks/:id', () => {
    it('returns an existing task', async () => {
      const task = await createTask();
      const response = await api().get(`/tasks/${task.id}`).expect(200);

      expect(response.body).toEqual(task);
    });

    it('returns 404 for a non-existent task', async () => {
      const response = await api().get('/tasks/missing-id').expect(404);

      expect(response.body).toEqual({
        error: { code: 'TASK_NOT_FOUND', message: 'Task missing-id not found' },
      });
    });
  });

  describe('POST /tasks', () => {
    it('creates a task with defaults', async () => {
      const response = await api().post('/tasks').send({ title: 'New task' }).expect(201);

      expect(response.body).toMatchObject({
        title: 'New task',
        description: '',
        status: 'todo',
      });
      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));
    });

    it('creates a task with all supplied fields', async () => {
      const response = await api()
        .post('/tasks')
        .send({
          title: 'Active task',
          description: 'Already underway',
          status: 'in-progress',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Active task',
        description: 'Already underway',
        status: 'in-progress',
      });
    });

    it('rejects a missing title', async () => {
      const response = await api().post('/tasks').send({ description: 'No title' }).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
      );
    });

    it.each([
      ['title', { title: 42 }],
      ['description', { title: 'Task', description: ['invalid'] }],
      ['status', { title: 'Task', status: 10 }],
    ])('rejects an invalid %s type', async (_field, body) => {
      const response = await api().post('/tasks').send(body).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an empty title', async () => {
      const response = await api().post('/tasks').send({ title: '   ' }).expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title', message: 'Title is required' }),
        ]),
      );
    });

    it('rejects a description longer than 2000 characters', async () => {
      const response = await api()
        .post('/tasks')
        .send({ title: 'Task', description: 'x'.repeat(2001) })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'description' })]),
      );
    });
  });

  describe('PUT /tasks/:id', () => {
    it('replaces an existing task', async () => {
      const task = await createTask();
      const response = await api()
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated', description: 'Changed', status: 'done' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: task.id,
        title: 'Updated',
        description: 'Changed',
        status: 'done',
        createdAt: task.createdAt,
      });
      expect(response.body.updatedAt).toEqual(expect.any(String));
    });

    it('returns 404 for a non-existent task', async () => {
      const response = await api()
        .put('/tasks/missing-id')
        .send({ title: 'Updated', description: 'Changed', status: 'done' })
        .expect(404);

      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it.each([
      ['title', { description: 'Changed', status: 'done' }],
      ['description', { title: 'Updated', status: 'done' }],
      ['status', { title: 'Updated', description: 'Changed' }],
    ])('rejects a missing %s field', async (_field, body) => {
      const task = await createTask();
      const response = await api().put(`/tasks/${task.id}`).send(body).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['title', { title: false, description: 'Changed', status: 'done' }],
      ['description', { title: 'Updated', description: 42, status: 'done' }],
      ['status', { title: 'Updated', description: 'Changed', status: true }],
    ])('rejects an invalid %s type', async (_field, body) => {
      const task = await createTask();
      const response = await api().put(`/tasks/${task.id}`).send(body).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task', async () => {
      const task = await createTask();

      await api().delete(`/tasks/${task.id}`).expect(204);
      await api().get(`/tasks/${task.id}`).expect(404);
    });

    it('returns 404 for a non-existent task', async () => {
      const response = await api().delete('/tasks/missing-id').expect(404);

      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });
});