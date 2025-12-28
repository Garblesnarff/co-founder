import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { listCompletedTasks } from '../../services/completion-service.js';

export const cofounderListCompletedTool = {
  name: 'cofounder_list_completed',
  description: 'List completed tasks for accountability and pattern analysis.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Max tasks to return (default 10)',
      },
      project: {
        type: 'string',
        description: 'Filter by project (optional)',
      },
      since: {
        type: 'string',
        description: 'ISO date to filter from (e.g. "2025-12-01")',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  limit: z.number().int().positive().max(100).default(10),
  project: z.string().optional(),
  since: z.string().optional(),
});

export async function handleCofounderListCompleted(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const sinceDate = input.since ? new Date(input.since) : undefined;

  const tasks = await listCompletedTasks(input.limit, input.project, sinceDate);

  return {
    tasks: tasks.map(t => ({
      id: t.id,
      task: t.task,
      context: t.context,
      completedAt: t.completedAt,
      timeTakenMinutes: t.timeTakenMinutes,
      notes: t.notes,
      project: t.project,
    })),
    count: tasks.length,
    filters: {
      limit: input.limit,
      project: input.project || null,
      since: input.since || null,
    },
  };
}
