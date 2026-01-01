import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getTaskById, isTaskBlocked } from '../../services/queue-service.js';

export const cofounderGetTaskTool = {
  name: 'cofounder_get_task',
  description: 'Get details of a specific task by ID.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task to retrieve',
      },
    },
    required: ['taskId'],
  },
};

const inputSchema = z.object({
  taskId: z.number(),
});

export async function handleCofounderGetTask(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);
  const task = await getTaskById(input.taskId);

  if (!task) {
    throw new Error(`Task #${input.taskId} not found in queue`);
  }

  const blocked = await isTaskBlocked(task);

  return {
    id: task.id,
    task: task.task,
    context: task.context,
    priority: task.priority,
    project: task.project,
    estimatedMinutes: task.estimatedMinutes,
    addedAt: task.addedAt,
    addedBy: task.addedBy,
    blockedBy: task.blockedBy,
    isBlocked: blocked,
    dueDate: task.dueDate,
    tags: task.tags,
  };
}
