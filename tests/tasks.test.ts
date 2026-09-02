import { describe, expect, it } from '@jest/globals';
import { api, createTask, createTasks } from './setup.js';

describe('Task API', () => {
  describe('GET /tasks', () => {
    it('returns all tasks', async () => {
      const task = await createTask();
      const response = await api().get('/tasks').expect(200);

      expect(response.body).toEqual({ data: [task], nextCursor: null, hasMore: false });
    });

    it('returns an empty page when no tasks exist', async () => {
      const response = await api().get('/tasks').expect(200);

      expect(response.body).toEqual({ data: [], nextCursor: null, hasMore: false });
    });

    it('defaults to a limit of 20 and sorts newest first', async () => {
      const tasks = await createTasks(25);

      const response = await api().get('/tasks').expect(200);

      expect(response.body.data).toHaveLength(20);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.nextCursor).toEqual(expect.any(String));
      expect(response.body.data.map((task: { id: string }) => task.id)).toEqual(
        tasks
          .slice()
          .reverse()
          .slice(0, 20)
          .map((task) => task.id),
      );
    });

    it('respects a custom limit', async () => {
      await createTasks(5);

      const response = await api().get('/tasks?limit=2').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.nextCursor).toEqual(expect.any(String));
    });

    it('returns hasMore false and nextCursor null on the last page', async () => {
      await createTasks(3);

      const response = await api().get('/tasks?limit=10').expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.hasMore).toBe(false);
      expect(response.body.nextCursor).toBeNull();
    });

    it('paginates through all tasks using the returned cursor', async () => {
      const tasks = await createTasks(5);
      const expectedOrder = tasks.slice().reverse().map((task) => task.id);
      const collectedIds: string[] = [];

      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const query = cursor ? `?limit=2&cursor=${encodeURIComponent(cursor)}` : '?limit=2';
        // eslint-disable-next-line no-await-in-loop
        const response = await api().get(`/tasks${query}`).expect(200);

        collectedIds.push(...response.body.data.map((task: { id: string }) => task.id));
        hasMore = response.body.hasMore;
        cursor = response.body.nextCursor ?? undefined;
      }

      expect(collectedIds).toEqual(expectedOrder);
    });

    it.each([['abc'], ['0'], ['-1'], ['1.5'], ['101']])(
      'rejects an invalid limit of %s',
      async (limit) => {
        const response = await api().get(`/tasks?limit=${limit}`).expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      },
    );

    it('rejects a malformed cursor', async () => {
      const response = await api().get('/tasks?cursor=not-valid-base64!!').expect(400);

      expect(response.body.error.code).toBe('INVALID_CURSOR');
    });

    it('rejects a cursor for a task that no longer exists', async () => {
      const task = await createTask();
      const cursor = Buffer.from(task.id, 'utf8').toString('base64');
      await api().delete(`/tasks/${task.id}`).expect(204);

      const response = await api().get(`/tasks?cursor=${encodeURIComponent(cursor)}`).expect(400);

      expect(response.body.error.code).toBe('INVALID_CURSOR');
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