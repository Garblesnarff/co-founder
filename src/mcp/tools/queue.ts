import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState } from '../../services/state-service.js';
import { getQueue, isTaskBlocked, getTasksByTag } from '../../services/queue-service.js';

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
      tag: {
        type: 'string',
        description: 'Filter by tag (optional)',
      },
      project: {
        type: 'string',
        description: 'Filter by project (optional)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  limit: z.number().optional().default(10),
  tag: z.string().optional(),
  project: z.string().optional(),
});

export async function handleCofounderQueue(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);
  const state = await getState();

  // Get queue, optionally filtered by tag
  let queue = input.tag
    ? await getTasksByTag(input.tag)
    : await getQueue();

  // Filter by project if provided
  if (input.project) {
    queue = queue.filter(t => t.project === input.project);
  }

  // Add blocked status to each task
  const tasksWithStatus = await Promise.all(
    queue.slice(0, input.limit).map(async t => ({
      id: t.id,
      task: t.task,
      priority: t.priority,
      project: t.project,
      estimatedMinutes: t.estimatedMinutes,
      context: t.context,
      blockedBy: t.blockedBy,
      isBlocked: await isTaskBlocked(t),
      dueDate: t.dueDate,
      tags: t.tags,
    }))
  );

  const blockedCount = tasksWithStatus.filter(t => t.isBlocked).length;
  const overdueTasks = tasksWithStatus.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;

  return {
    currentTask: state?.currentTask || null,
    currentTaskContext: state?.currentTaskContext || null,
    queue: tasksWithStatus,
    totalInQueue: queue.length,
    blockedCount,
    readyCount: tasksWithStatus.length - blockedCount,
    overdueCount: overdueTasks,
    filters: {
      tag: input.tag || null,
      project: input.project || null,
    },
  };
}
