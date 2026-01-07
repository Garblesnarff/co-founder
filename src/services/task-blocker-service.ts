import { db } from '../db/client.js';
import { taskQueue, type TaskQueueItem } from '../db/schema/index.js';
import { founderState } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { getQueue, getTaskById } from './queue-crud-service.js';

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
