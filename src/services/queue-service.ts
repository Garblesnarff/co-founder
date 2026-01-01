import { db } from '../db/client.js';
import { taskQueue, type TaskQueueItem, type NewTaskQueueItem } from '../db/schema/index.js';
import { founderState } from '../db/schema/index.js';
import { eq, desc, like, or, sql, and, isNotNull } from 'drizzle-orm';

export async function getQueue(): Promise<TaskQueueItem[]> {
  return db
    .select()
    .from(taskQueue)
    .orderBy(desc(taskQueue.priority), taskQueue.addedAt);
}

export async function getNextTask(): Promise<TaskQueueItem | null> {
  const [next] = await db
    .select()
    .from(taskQueue)
    .orderBy(desc(taskQueue.priority), taskQueue.addedAt)
    .limit(1);
  return next || null;
}

export async function getTaskById(id: number): Promise<TaskQueueItem | null> {
  const [task] = await db
    .select()
    .from(taskQueue)
    .where(eq(taskQueue.id, id))
    .limit(1);
  return task || null;
}

export async function addTask(
  task: string,
  priority: number,
  project: string | null,
  context: string | null,
  addedBy: string | null,
  blockedBy: number[] = [],
  dueDate: Date | null = null,
  tags: string[] = []
): Promise<TaskQueueItem> {
  const [created] = await db
    .insert(taskQueue)
    .values({
      task,
      priority,
      project,
      context,
      addedBy,
      blockedBy,
      dueDate,
      tags,
    })
    .returning();
  return created;
}

export async function removeTask(id: number): Promise<void> {
  await db.delete(taskQueue).where(eq(taskQueue.id, id));
}

export async function reprioritize(id: number, newPriority: number): Promise<TaskQueueItem | null> {
  const [updated] = await db
    .update(taskQueue)
    .set({ priority: newPriority })
    .where(eq(taskQueue.id, id))
    .returning();
  return updated || null;
}

export async function getQueueDepth(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function updateTask(id: number, updates: {
  task?: string;
  context?: string | null;
  estimatedMinutes?: number | null;
  project?: string | null;
  blockedBy?: number[];
  dueDate?: Date | null;
  tags?: string[];
}): Promise<TaskQueueItem | null> {
  const [updated] = await db
    .update(taskQueue)
    .set(updates)
    .where(eq(taskQueue.id, id))
    .returning();
  return updated || null;
}

export async function deleteTask(id: number): Promise<TaskQueueItem | null> {
  const [deleted] = await db
    .delete(taskQueue)
    .where(eq(taskQueue.id, id))
    .returning();
  return deleted || null;
}

// Check if a task is blocked (any of its blockedBy tasks still exist in queue OR are in progress)
export async function isTaskBlocked(task: TaskQueueItem): Promise<boolean> {
  const blockedBy = task.blockedBy || [];
  if (blockedBy.length === 0) return false;

  // Get current task ID (claimed tasks are removed from queue but still in progress)
  const [state] = await db.select().from(founderState).where(eq(founderState.id, 1)).limit(1);
  const currentTaskId = state?.currentTaskId;

  // Check if any blocking tasks still exist in queue OR are currently being worked on
  for (const blockingId of blockedBy) {
    // Check if blocker is the current task (in progress)
    if (currentTaskId === blockingId) return true;
    // Check if blocker is still in queue
    const blocking = await getTaskById(blockingId);
    if (blocking) return true;
  }
  return false; // All blocking tasks completed
}

// Get tasks that would be unblocked by completing a task
export async function getTasksUnblockedBy(completedTaskId: number): Promise<TaskQueueItem[]> {
  const queue = await getQueue();
  const unblocked: TaskQueueItem[] = [];

  // Get current task ID (the one being completed - still set at this point)
  const [state] = await db.select().from(founderState).where(eq(founderState.id, 1)).limit(1);
  const currentTaskId = state?.currentTaskId;

  for (const task of queue) {
    const blockedBy = task.blockedBy || [];
    if (blockedBy.includes(completedTaskId)) {
      // Check if any OTHER blockers remain (not the one being completed, not the current task)
      const remainingBlockers = blockedBy.filter(id => id !== completedTaskId && id !== currentTaskId);
      let stillBlocked = false;
      for (const blockerId of remainingBlockers) {
        const blocker = await getTaskById(blockerId);
        if (blocker) {
          stillBlocked = true;
          break;
        }
      }
      if (!stillBlocked) {
        unblocked.push(task);
      }
    }
  }

  return unblocked;
}

// Get next unblocked task
export async function getNextUnblockedTask(): Promise<TaskQueueItem | null> {
  const queue = await getQueue();
  for (const task of queue) {
    const blocked = await isTaskBlocked(task);
    if (!blocked) return task;
  }
  return null;
}

// Remove a completed task ID from all blockedBy arrays (auto-unblock)
export async function removeBlockerFromTasks(completedTaskId: number): Promise<number> {
  // Find all tasks that have this ID in their blockedBy array
  const tasksToUpdate = await db
    .select()
    .from(taskQueue)
    .where(sql`${taskQueue.blockedBy} @> ${JSON.stringify([completedTaskId])}::jsonb`);

  if (tasksToUpdate.length === 0) return 0;

  // Update each task to remove the completed ID from blockedBy
  let updatedCount = 0;
  for (const task of tasksToUpdate) {
    const currentBlockers = task.blockedBy || [];
    const newBlockers = currentBlockers.filter(id => id !== completedTaskId);
    await db
      .update(taskQueue)
      .set({ blockedBy: newBlockers })
      .where(eq(taskQueue.id, task.id));
    updatedCount++;
  }

  return updatedCount;
}

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

// Get all blocked tasks with their blocker details
export async function getBlockedTasks(): Promise<Array<TaskQueueItem & { blockerDetails: Array<{ id: number; task: string; exists: boolean }> }>> {
  const queue = await getQueue();
  const blockedTasks: Array<TaskQueueItem & { blockerDetails: Array<{ id: number; task: string; exists: boolean }> }> = [];

  // Get current task ID
  const [state] = await db.select().from(founderState).where(eq(founderState.id, 1)).limit(1);
  const currentTaskId = state?.currentTaskId;

  for (const task of queue) {
    const blockedBy = task.blockedBy || [];
    if (blockedBy.length === 0) continue;

    const blockerDetails: Array<{ id: number; task: string; exists: boolean }> = [];
    let isBlocked = false;

    for (const blockerId of blockedBy) {
      const blocker = await getTaskById(blockerId);
      const isCurrentTask = currentTaskId === blockerId;
      const exists = blocker !== null || isCurrentTask;

      blockerDetails.push({
        id: blockerId,
        task: blocker?.task || (isCurrentTask ? state?.currentTask || 'In progress' : 'Completed/Removed'),
        exists,
      });

      if (exists) isBlocked = true;
    }

    if (isBlocked) {
      blockedTasks.push({ ...task, blockerDetails });
    }
  }

  return blockedTasks;
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
