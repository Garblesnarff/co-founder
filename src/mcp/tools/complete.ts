import { z } from 'zod';
import { getState, clearCurrentTask, assignTask, incrementStreak } from '../../services/state-service.js';
import { removeTask, getQueueDepth, getTaskById } from '../../services/queue-crud-service.js';
import { getNextUnblockedTask, getTasksUnblockedBy, removeBlockerFromTasks } from '../../services/task-blocker-service.js';
import { completeTask } from '../../services/completion-service.js';
import { incrementTasksCompleted } from '../../services/daily-log-service.js';
import { incrementSessionTasks, getActiveSession } from '../../services/session-service.js';
import { syncTaskCompleted } from '../../services/notion-service.js';
import { getTaskNotes } from '../../services/task-notes-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema, timeTakenMinutesSchema, optionalStringSchema } from '../../schemas/common.js';
import { ConflictError, ValidationError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.optional().describe('Task ID to complete. Optional - defaults to current task.'),
  timeTakenMinutes: timeTakenMinutesSchema.describe('How many minutes the task took (optional)'),
  notes: optionalStringSchema.describe('Any notes about completion (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderCompleteTool = createMcpToolDefinition(
  'cofounder_complete',
  `Complete current task and get next. Returns next task WITH notes - no separate get_task_notes call needed. taskId is optional (defaults to current task).`,
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderComplete = createToolHandler(
  inputSchema,
  async (input) => {
    const state = await getState();

    if (!state?.currentTask) {
      throw new ConflictError('No current task to complete');
    }

    // Default taskId to current task if not provided
    const taskId = input.taskId ?? state.currentTaskId;

    // Validate taskId matches current task to prevent accidental completions
    if (taskId !== state.currentTaskId) {
      throw new ValidationError(
        `Task ID ${taskId} doesn't match current task ID ${state.currentTaskId} ` +
        `(current task: "${state.currentTask}"). Use cofounder_checkin to see current task.`
      );
    }

    // Log the completion
    await completeTask(
      state.currentTask,
      state.currentTaskContext,
      input.timeTakenMinutes || null,
      input.notes || null,
      null // project can be added later
    );

    const completedTaskId = state.currentTaskId;
    const completedTaskName = state.currentTask;

    // Sync completion to Notion before removing from queue
    if (completedTaskId) {
      const taskData = await getTaskById(completedTaskId);
      if (taskData) {
        syncTaskCompleted(taskData).catch(() => {});
      }
    }

    // Remove from queue if it was queued
    if (completedTaskId) {
      await removeTask(completedTaskId);
      // Auto-unblock: Remove this task ID from all blockedBy arrays
      await removeBlockerFromTasks(completedTaskId);
    }

    // Update daily log
    await incrementTasksCompleted();

    // Update streak
    await incrementStreak();

    // Update session task count if in a session
    const session = await getActiveSession();
    if (session) {
      await incrementSessionTasks(session.id);
    }

    // Check what tasks are now unblocked by this completion
    const unblockedTasks = completedTaskId
      ? await getTasksUnblockedBy(completedTaskId)
      : [];

    // Get next unblocked task
    const nextTask = await getNextUnblockedTask();

    if (nextTask) {
      await assignTask(nextTask.task, nextTask.context, nextTask.id);
    } else {
      await clearCurrentTask();
    }

    const queueRemaining = await getQueueDepth();
    const newState = await getState();

    // Get notes for next task (saves AI a separate call)
    const nextTaskNotes = nextTask
      ? await getTaskNotes(nextTask.id)
      : [];

    return {
      completed: completedTaskName,
      newTask: nextTask ? {
        id: nextTask.id,
        task: nextTask.task,
        context: nextTask.context,
        priority: nextTask.priority,
        project: nextTask.project,
        estimatedMinutes: nextTask.estimatedMinutes,
        notes: nextTaskNotes.map(n => ({
          type: n.noteType,
          note: n.note,
          at: n.createdAt,
        })),
      } : null,
      streakDays: newState?.streakDays || 0,
      queueRemaining,
      unblockedTasks: unblockedTasks.map(t => ({ id: t.id, task: t.task })),
      message: nextTask
        ? `Good. Next: ${nextTask.task}`
        : 'Queue empty. Add more tasks.',
    };
  }
);
