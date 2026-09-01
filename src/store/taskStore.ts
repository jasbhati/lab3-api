import { randomUUID } from 'node:crypto';
import { CreateTaskInput, Task, UpdateTaskInput } from '../models/task.js';

class TaskStore {
  private readonly tasks: Task[] = [];

  findAll(): Task[] {
    return [...this.tasks];
  }

  findById(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
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