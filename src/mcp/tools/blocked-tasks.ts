import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getBlockedTasks } from '../../services/queue-service.js';

export const cofounderBlockedTasksTool = {
  name: 'cofounder_blocked_tasks',
  description: 'Get all blocked tasks with their blockers.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
};

const inputSchema = z.object({});

export async function handleCofounderBlockedTasks(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  inputSchema.parse(args);

  const blockedTasks = await getBlockedTasks();

  return {
    blockedTasks: blockedTasks.map(t => ({
      id: t.id,
      task: t.task,
      priority: t.priority,
      project: t.project,
      blockedBy: t.blockedBy,
      blockerDetails: t.blockerDetails,
      dueDate: t.dueDate,
    })),
    count: blockedTasks.length,
    message: blockedTasks.length > 0
      ? `Found ${blockedTasks.length} blocked task(s).`
      : 'No blocked tasks.',
  };
}
