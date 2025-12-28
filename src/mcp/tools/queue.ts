import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState } from '../../services/state-service.js';
import { getQueue } from '../../services/queue-service.js';

export const cofounderQueueTool = {
  name: 'cofounder_queue',
  description: 'View the current task queue, ordered by priority.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Max number of tasks to return (default 10)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  limit: z.number().optional().default(10),
});

export async function handleCofounderQueue(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);
  const state = await getState();
  const queue = await getQueue();

  return {
    currentTask: state?.currentTask || null,
    currentTaskContext: state?.currentTaskContext || null,
    queue: queue.slice(0, input.limit).map(t => ({
      id: t.id,
      task: t.task,
      priority: t.priority,
      project: t.project,
      estimatedMinutes: t.estimatedMinutes,
      context: t.context,
    })),
    totalInQueue: queue.length,
  };
}
