import { db } from '../db/client.js';
import { taskQueue, type TaskQueueItem, type NewTaskQueueItem } from '../db/schema/index.js';
import { founderState } from '../db/schema/index.js';
import { eq, desc } from 'drizzle-orm';

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
  blockedBy: number[] = []
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
