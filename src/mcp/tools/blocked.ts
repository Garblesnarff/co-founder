import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState, assignTask, clearCurrentTask } from '../../services/state-service.js';
import { getNextTask, removeTask, getQueueDepth, getQueue } from '../../services/queue-service.js';
import { logBlocker } from '../../services/blocker-service.js';

export const cofounderBlockedTool = {
  name: 'cofounder_blocked',
  description: 'Report that you are blocked on the current task. Logs the blocker and optionally reassigns to a different task.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      blocker: {
        type: 'string',
        description: 'What is blocking progress',
      },
      context: {
        type: 'string',
        description: 'Additional context about the blocker (optional)',
      },
      skipToNext: {
        type: 'boolean',
        description: 'If true, skip current task and move to next in queue',
      },
    },
    required: ['blocker'],
  },
};

const inputSchema = z.object({
  blocker: z.string(),
  context: z.string().optional(),
  skipToNext: z.boolean().optional().default(true),
});

export async function handleCofounderBlocked(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);
  const state = await getState();

  // Log the blocker
  await logBlocker(input.blocker, input.context || null);

  let recommendation: string;
  let newTask: string | null = null;
  let newTaskContext: string | null = null;

  if (input.skipToNext) {
    // Don't remove from queue - just skip
    // Get next task that isn't the current one
    const queue = await getQueue();
    const alternativeTask = queue.find(t => t.id !== state?.currentTaskId);

    if (alternativeTask) {
      await assignTask(alternativeTask.task, alternativeTask.context, alternativeTask.id);
      newTask = alternativeTask.task;
      newTaskContext = alternativeTask.context;
      recommendation = `Skip blocked task. Reassigning to: ${alternativeTask.task}`;
    } else {
      await clearCurrentTask();
      recommendation = 'No alternative tasks in queue. Add more tasks or resolve the blocker.';
    }
  } else {
    recommendation = 'Blocker logged. Current task unchanged. Resolve blocker to continue.';
  }

  return {
    blockerLogged: input.blocker,
    recommendation,
    newTask,
    newTaskContext,
    queueDepth: await getQueueDepth(),
  };
}
