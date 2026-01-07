import { db } from '../db/client.js';
import { taskQueue, type TaskQueueItem } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import {
  isNotionEnabled,
  createNotionPage,
  updateNotionPage,
  archiveNotionPage,
  setNotionPageStatus,
  type NotionTaskProperties,
} from '../lib/notion-client.js';

/**
 * Convert a TaskQueueItem to NotionTaskProperties.
 */
function taskToNotionProperties(task: TaskQueueItem): NotionTaskProperties {
  return {
    title: task.task,
    priority: task.priority,
    project: task.project,
    tags: task.tags || [],
    context: task.context,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
  };
}

/**
 * Store the Notion page ID on a task.
 * This is called after successfully creating a page in Notion.
 */
async function storeNotionPageId(taskId: number, notionPageId: string): Promise<void> {
  try {
    await db
      .update(taskQueue)
      .set({ notionPageId })
      .where(eq(taskQueue.id, taskId));
  } catch (error) {
    console.error('[NotionSync] Failed to store page ID:', error);
  }
}

/**
 * Sync a newly created task to Notion.
 * Creates a page and stores the page ID.
 */
export async function syncTaskCreated(task: TaskQueueItem): Promise<void> {
  if (!isNotionEnabled()) return;

  try {
    const notionPageId = await createNotionPage(taskToNotionProperties(task));
    if (notionPageId) {
      await storeNotionPageId(task.id, notionPageId);
      console.log(`[NotionSync] Created page for task ${task.id}: ${notionPageId}`);
    }
  } catch (error) {
    console.error('[NotionSync] Error creating task:', error);
    // Don't throw - sync failures shouldn't block operations
  }
}

/**
 * Sync an updated task to Notion.
 * Updates the existing page if we have a page ID.
 */
export async function syncTaskUpdated(task: TaskQueueItem): Promise<void> {
  if (!isNotionEnabled()) return;

  // Need the page ID to update
  if (!task.notionPageId) {
    // Task was created before Notion sync was enabled - create it now
    await syncTaskCreated(task);
    return;
  }

  try {
    const success = await updateNotionPage(task.notionPageId, taskToNotionProperties(task));
    if (success) {
      console.log(`[NotionSync] Updated page for task ${task.id}`);
    }
  } catch (error) {
    console.error('[NotionSync] Error updating task:', error);
  }
}

/**
 * Sync a deleted task to Notion.
 * Archives the page (soft delete).
 */
export async function syncTaskDeleted(task: TaskQueueItem): Promise<void> {
  if (!isNotionEnabled()) return;

  if (!task.notionPageId) {
    // No page to archive
    return;
  }

  try {
    const success = await archiveNotionPage(task.notionPageId);
    if (success) {
      console.log(`[NotionSync] Archived page for task ${task.id}`);
    }
  } catch (error) {
    console.error('[NotionSync] Error archiving task:', error);
  }
}

/**
 * Mark a task as completed in Notion.
 * Sets the Status property to "Done".
 */
export async function syncTaskCompleted(task: TaskQueueItem): Promise<void> {
  if (!isNotionEnabled()) return;

  if (!task.notionPageId) {
    // No page to update
    return;
  }

  try {
    const success = await setNotionPageStatus(task.notionPageId, 'Done');
    if (success) {
      console.log(`[NotionSync] Marked task ${task.id} as Done in Notion`);
    }
  } catch (error) {
    console.error('[NotionSync] Error marking task complete:', error);
  }
}

/**
 * Get the Notion page ID for a task.
 * Useful when we need to look it up from the database.
 */
export async function getNotionPageId(taskId: number): Promise<string | null> {
  try {
    const [task] = await db
      .select({ notionPageId: taskQueue.notionPageId })
      .from(taskQueue)
      .where(eq(taskQueue.id, taskId))
      .limit(1);
    return task?.notionPageId || null;
  } catch (error) {
    console.error('[NotionSync] Error fetching page ID:', error);
    return null;
  }
}
