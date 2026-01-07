/**
 * Response Mappers
 *
 * Reusable functions for transforming database records into API response objects.
 * These mappers ensure consistent response shapes across all MCP tools.
 */

import type { TaskQueueItem } from '../db/schema/task-queue';
import type { CompletedTask } from '../db/schema/completed-tasks';
import type { McpIssue } from '../db/schema/mcp-issues';
import type { Learning } from '../db/schema/learnings';

/**
 * Maps a task queue item to its API response shape.
 * Excludes internal fields like `addedBy` that aren't needed in responses.
 */
export const mapTask = (t: TaskQueueItem) => ({
  id: t.id,
  task: t.task,
  context: t.context,
  priority: t.priority,
  project: t.project,
  dueDate: t.dueDate,
  tags: t.tags,
  estimatedMinutes: t.estimatedMinutes,
  addedAt: t.addedAt,
  blockedBy: t.blockedBy,
  notionPageId: t.notionPageId,
});

/**
 * Maps a task with additional status information (e.g., from cofounder_checkin).
 */
export const mapTaskWithStatus = (t: TaskQueueItem, status: 'current' | 'pending' | 'blocked') => ({
  ...mapTask(t),
  status,
});

/**
 * Maps a completed task to its API response shape.
 */
export const mapCompletedTask = (c: CompletedTask) => ({
  id: c.id,
  task: c.task,
  context: c.context,
  completedAt: c.completedAt,
  timeTakenMinutes: c.timeTakenMinutes,
  notes: c.notes,
  project: c.project,
});

/**
 * Maps an MCP issue to its API response shape.
 */
export const mapIssue = (i: McpIssue) => ({
  id: i.id,
  type: i.type,
  title: i.title,
  description: i.description,
  reportedBy: i.reportedBy,
  status: i.status,
  priority: i.priority,
  resolution: i.resolution,
  createdAt: i.createdAt,
  updatedAt: i.updatedAt,
});

/**
 * Maps a learning to its API response shape.
 */
export const mapLearning = (l: Learning) => ({
  id: l.id,
  content: l.content,
  category: l.category,
  tags: l.tags,
  source: l.source,
  createdAt: l.createdAt,
  createdBy: l.createdBy,
});

/**
 * Type definitions for mapped responses.
 * These can be used to type API response handlers.
 */
export type MappedTask = ReturnType<typeof mapTask>;
export type MappedTaskWithStatus = ReturnType<typeof mapTaskWithStatus>;
export type MappedCompletedTask = ReturnType<typeof mapCompletedTask>;
export type MappedIssue = ReturnType<typeof mapIssue>;
export type MappedLearning = ReturnType<typeof mapLearning>;

/**
 * Batch mapping functions for arrays.
 * Useful when returning lists of items.
 */
export const mapTasks = (tasks: TaskQueueItem[]): MappedTask[] => tasks.map(mapTask);
export const mapCompletedTasks = (tasks: CompletedTask[]): MappedCompletedTask[] => tasks.map(mapCompletedTask);
export const mapIssues = (issues: McpIssue[]): MappedIssue[] => issues.map(mapIssue);
export const mapLearnings = (learnings: Learning[]): MappedLearning[] => learnings.map(mapLearning);
