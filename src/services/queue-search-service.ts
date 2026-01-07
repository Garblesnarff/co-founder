import { db } from '../db/client.js';
import { taskQueue, type TaskQueueItem } from '../db/schema/index.js';
import { desc, or, sql, and, isNotNull } from 'drizzle-orm';

// Search tasks by keyword in task description and context
export async function searchTasks(query: string, limit: number = 20): Promise<TaskQueueItem[]> {
  const searchPattern = `%${query.toLowerCase()}%`;
  return db
    .select()
    .from(taskQueue)
    .where(
      or(
        sql`LOWER(${taskQueue.task}) LIKE ${searchPattern}`,
        sql`LOWER(${taskQueue.context}) LIKE ${searchPattern}`
      )
    )
    .orderBy(desc(taskQueue.priority), taskQueue.addedAt)
    .limit(limit);
}

// Get tasks with upcoming or overdue deadlines
export async function getTasksWithDeadlines(includeOverdue: boolean = true): Promise<TaskQueueItem[]> {
  const now = new Date();

  if (includeOverdue) {
    return db
      .select()
      .from(taskQueue)
      .where(isNotNull(taskQueue.dueDate))
      .orderBy(taskQueue.dueDate);
  }

  return db
    .select()
    .from(taskQueue)
    .where(and(
      isNotNull(taskQueue.dueDate),
      sql`${taskQueue.dueDate} >= ${now}`
    ))
    .orderBy(taskQueue.dueDate);
}

// Get tasks by tag
export async function getTasksByTag(tag: string): Promise<TaskQueueItem[]> {
  return db
    .select()
    .from(taskQueue)
    .where(sql`${taskQueue.tags} @> ${JSON.stringify([tag])}::jsonb`)
    .orderBy(desc(taskQueue.priority), taskQueue.addedAt);
}
