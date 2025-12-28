import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { reprioritize, getTaskById, getQueue } from '../../services/queue-service.js';

export const cofounderReprioritizeTool = {
  name: 'cofounder_reprioritize',
  description: 'Change the priority of a task in the queue.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task to reprioritize',
      },
      newPriority: {
        type: 'number',
        description: 'New priority (0-10)',
      },
      reason: {
        type: 'string',
        description: 'Why the priority is changing (optional)',
      },
    },
    required: ['taskId', 'newPriority'],
  },
};

const inputSchema = z.object({
  taskId: z.number(),
  newPriority: z.number().min(0).max(10),
  reason: z.string().optional(),
});

export async function handleCofounderReprioritize(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const task = await getTaskById(input.taskId);
  if (!task) {
    throw new Error(`Task ${input.taskId} not found`);
  }

  const oldPriority = task.priority;
  const updated = await reprioritize(input.taskId, input.newPriority);

  // Get new position
  const queue = await getQueue();
  const newPosition = queue.findIndex(t => t.id === input.taskId) + 1;

  return {
    task: task.task,
    oldPriority,
    newPriority: input.newPriority,
    reason: input.reason || null,
    newQueuePosition: newPosition,
  };
}
