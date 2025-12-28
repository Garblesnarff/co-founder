import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState, clearCurrentTask, assignTask, incrementStreak } from '../../services/state-service.js';
import { getNextTask, removeTask, getQueueDepth } from '../../services/queue-service.js';
import { completeTask } from '../../services/completion-service.js';
import { incrementTasksCompleted } from '../../services/daily-log-service.js';

export const cofounderCompleteTool = {
  name: 'cofounder_complete',
  description: 'Mark the current task as complete and get the next task from the queue.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      timeTakenMinutes: {
        type: 'number',
        description: 'How many minutes the task took (optional)',
      },
      notes: {
        type: 'string',
        description: 'Any notes about completion (optional)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
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

  // Log the completion
  await completeTask(
    state.currentTask,
    state.currentTaskContext,
    input.timeTakenMinutes || null,
    input.notes || null,
    null // project can be added later
  );

  // Remove from queue if it was queued
  if (state.currentTaskId) {
    await removeTask(state.currentTaskId);
  }

  // Update daily log
  await incrementTasksCompleted();

  // Update streak
  await incrementStreak();

  // Get next task
  const nextTask = await getNextTask();
  const completedTaskName = state.currentTask;

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
    message: nextTask
      ? `Good. Next: ${nextTask.task}`
      : 'Queue empty. Add more tasks.',
  };
}
