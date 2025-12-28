import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getTaskById, deleteTask, getQueueDepth } from '../../services/queue-service.js';

export const cofounderDeleteTaskTool = {
  name: 'cofounder_delete_task',
  description: 'Delete a task from the queue (e.g., if it became obsolete).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task to delete',
      },
      reason: {
        type: 'string',
        description: 'Why the task is being deleted (optional, for logging)',
      },
    },
    required: ['taskId'],
  },
};

const inputSchema = z.object({
  taskId: z.number(),
  reason: z.string().optional(),
});

export async function handleCofounderDeleteTask(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  // Verify task exists
  const existing = await getTaskById(input.taskId);
  if (!existing) {
    throw new Error(`Task ${input.taskId} not found`);
  }

  const deleted = await deleteTask(input.taskId);
  const queueDepth = await getQueueDepth();

  return {
    deleted: {
      id: deleted?.id,
      task: deleted?.task,
      context: deleted?.context,
      priority: deleted?.priority,
    },
    reason: input.reason || null,
    queueDepth,
  };
}
