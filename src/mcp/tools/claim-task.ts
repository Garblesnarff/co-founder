import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getTaskById, getNextTask, removeTask, getQueueDepth } from '../../services/queue-service.js';
import { getState, assignTask } from '../../services/state-service.js';

export const cofounderClaimTaskTool = {
  name: 'cofounder_claim_task',
  description: 'Claim a task to work on. If no taskId provided, claims the highest priority task.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task to claim (optional - if omitted, claims top of queue)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  taskId: z.number().optional(),
});

export async function handleCofounderClaimTask(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  // Check if already have a current task
  const state = await getState();
  if (state?.currentTask) {
    throw new Error(`Already have a task in progress: "${state.currentTask}". Complete it first.`);
  }

  let taskId = input.taskId;

  // If no taskId provided, claim top of queue
  if (taskId === undefined) {
    const next = await getNextTask();
    if (!next) {
      return { error: 'Queue empty. No tasks to claim.' };
    }
    taskId = next.id;
  }

  // Verify task exists
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found in queue`);
  }

  // Claim the task: set as currentTask and remove from queue
  await assignTask(task.task, task.context, task.id);
  await removeTask(task.id);

  const queueRemaining = await getQueueDepth();
  const newState = await getState();

  return {
    claimed: {
      id: task.id,
      task: task.task,
      context: task.context,
      priority: task.priority,
      estimatedMinutes: task.estimatedMinutes,
      project: task.project,
    },
    streakDays: newState?.streakDays || 0,
    queueRemaining,
    message: `Now working on: ${task.task}`,
  };
}
