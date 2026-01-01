import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState, clearCurrentTask, assignTask, incrementStreak } from '../../services/state-service.js';
import { removeTask, getQueueDepth, getNextUnblockedTask, getTasksUnblockedBy, removeBlockerFromTasks } from '../../services/queue-service.js';
import { completeTask } from '../../services/completion-service.js';
import { incrementTasksCompleted } from '../../services/daily-log-service.js';
import { incrementSessionTasks, getActiveSession } from '../../services/session-service.js';

export const cofounderCompleteTool = {
  name: 'cofounder_complete',
  description: 'Mark the current task as complete and get the next task from the queue.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task being completed (must match current task). Required to prevent accidental completions.',
      },
      timeTakenMinutes: {
        type: 'number',
        description: 'How many minutes the task took (optional)',
      },
      notes: {
        type: 'string',
        description: 'Any notes about completion (optional)',
      },
    },
    required: ['taskId'],
  },
};

const inputSchema = z.object({
  taskId: z.number(),
  timeTakenMinutes: z.number().optional(),
  notes: z.string().optional(),
});

export async function handleCofounderComplete(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);
  const state = await getState();

  if (!state?.currentTask) {
    throw new Error('No current task to complete');
  }

  // Validate taskId matches current task to prevent accidental completions
  if (input.taskId !== state.currentTaskId) {
    throw new Error(
      `Task ID ${input.taskId} doesn't match current task ID ${state.currentTaskId} ` +
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

  return {
    completed: completedTaskName,
    newTask: nextTask?.task || null,
    newTaskContext: nextTask?.context || null,
    streakDays: newState?.streakDays || 0,
    queueRemaining,
    unblockedTasks: unblockedTasks.map(t => ({ id: t.id, task: t.task })),
    message: nextTask
      ? `Good. Next: ${nextTask.task}`
      : 'Queue empty. Add more tasks.',
  };
}
