import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { addTask, getQueue, getQueueDepth } from '../../services/queue-service.js';
import { incrementTasksAssigned } from '../../services/daily-log-service.js';

export const cofounderAddTaskTool = {
  name: 'cofounder_add_task',
  description: 'Add a new task to the queue. AI can add tasks for Rob to execute.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      task: {
        type: 'string',
        description: 'Clear, actionable task description',
      },
      context: {
        type: 'string',
        description: 'Why this matters, links, notes (optional)',
      },
      priority: {
        type: 'number',
        description: 'Priority 0-10 (10 = critical, 0 = low). Default 5.',
      },
      estimatedMinutes: {
        type: 'number',
        description: 'Estimated time in minutes (optional)',
      },
      project: {
        type: 'string',
        description: 'Project: infinite_realms, infrastructure, sanctuary, other',
      },
    },
    required: ['task'],
  },
};

const inputSchema = z.object({
  task: z.string(),
  context: z.string().optional(),
  priority: z.number().min(0).max(10).optional().default(5),
  estimatedMinutes: z.number().optional(),
  project: z.enum(['infinite_realms', 'infrastructure', 'sanctuary', 'other']).optional(),
});

export async function handleCofounderAddTask(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const created = await addTask(
    input.task,
    input.priority,
    input.project || null,
    input.context || null,
    auth.userId || 'ai'
  );

  await incrementTasksAssigned();

  // Calculate position in queue
  const queue = await getQueue();
  const position = queue.findIndex(t => t.id === created.id) + 1;

  return {
    added: input.task,
    priority: input.priority,
    queuePosition: position,
    queueDepth: await getQueueDepth(),
  };
}
