import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { db } from '../../db/client.js';
import { dispatchJobs } from '../../db/schema/index.js';
import { desc, eq, and } from 'drizzle-orm';

export const dispatchListTool = {
  name: 'dispatch_list',
  description: 'List recent dispatch jobs.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'running', 'completed', 'failed'],
        description: 'Filter by status',
      },
      target: {
        type: 'string',
        enum: ['hetzner', 'mac', 'cold_storage'],
        description: 'Filter by target',
      },
      limit: {
        type: 'number',
        description: 'Max jobs to return (default 10)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  target: z.enum(['hetzner', 'mac', 'cold_storage']).optional(),
  limit: z.number().optional().default(10),
});

export async function handleDispatchList(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  let conditions = [];
  if (input.status) {
    conditions.push(eq(dispatchJobs.status, input.status));
  }
  if (input.target) {
    conditions.push(eq(dispatchJobs.target, input.target));
  }

  const query = db.select()
    .from(dispatchJobs)
    .orderBy(desc(dispatchJobs.createdAt))
    .limit(input.limit);

  const jobs = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  const statusCounts = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
  };

  jobs.forEach(j => {
    if (j.status in statusCounts) {
      statusCounts[j.status as keyof typeof statusCounts]++;
    }
  });

  return {
    jobs: jobs.map(j => ({
      id: j.id,
      agent: j.agent,
      target: j.target,
      task: j.task.length > 100 ? j.task.slice(0, 100) + '...' : j.task,
      status: j.status,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
    })),
    total: jobs.length,
    statusCounts,
  };
}
