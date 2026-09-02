import { randomUUID } from 'node:crypto';
import { CreateTaskInput, Task, UpdateTaskInput } from '../models/task.js';

interface FindPageOptions {
  limit: number;
  afterId?: string;
}

interface FindPageResult {
  items: Task[];
  hasMore: boolean;
}

class TaskStore {
  private readonly tasks: Task[] = [];

  findAll(): Task[] {
    return [...this.tasks];
  }

  findById(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
  }

  findPage({ limit, afterId }: FindPageOptions): FindPageResult {
    // Tie-break on insertion index so same-millisecond creations still sort newest-first deterministically.
    const sorted = this.tasks
      .map((task, index) => ({ task, index }))
      .sort((a, b) => {
        if (a.task.createdAt !== b.task.createdAt) {
          return a.task.createdAt < b.task.createdAt ? 1 : -1;
        }
        return b.index - a.index;
      })
      .map((entry) => entry.task);

    let startIndex = 0;
    if (afterId) {
      const cursorIndex = sorted.findIndex((task) => task.id === afterId);
      startIndex = cursorIndex === -1 ? sorted.length : cursorIndex + 1;
    }

    const items = sorted.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sorted.length;

    return { items, hasMore };
  }

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'todo',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(task);
    return task;
  }

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const task = this.findById(id);

    if (!task) {
      return undefined;
    }

    task.title = input.title;
    task.description = input.description;
    task.status = input.status;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  delete(id: string): boolean {
    const index = this.tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return false;
    }

    this.tasks.splice(index, 1);
    return true;
  }

  clear(): void {
    this.tasks.length = 0;
  }
}

export const taskStore = new TaskStore();