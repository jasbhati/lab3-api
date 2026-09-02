export const taskStatuses = ['todo', 'in-progress', 'done'] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
}

export interface TaskPage {
  data: Task[];
  nextCursor: string | null;
  hasMore: boolean;
}