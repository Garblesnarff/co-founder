import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { db } from '../../db/client.js';
import { dispatchJobs } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

export const dispatchStatusTool = {
  name: 'dispatch_status',
  description: 'Check the status of a dispatch job.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      jobId: {
        type: 'number',
        description: 'Dispatch job ID',
      },
    },
    required: ['jobId'],
  },
};

const inputSchema = z.object({
  jobId: z.number(),
});

export async function handleDispatchStatus(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const [job] = await db.select()
    .from(dispatchJobs)
    .where(eq(dispatchJobs.id, input.jobId));

  if (!job) {
    throw new Error(`Dispatch job ${input.jobId} not found`);
  }

  return {
    id: job.id,
    agent: job.agent,
    target: job.target,
    task: job.task,
    status: job.status,
    result: job.result,
    errorMessage: job.errorMessage,
    repoPath: job.repoPath,
    trackAsTask: job.trackAsTask,
    cofounderTaskId: job.cofounderTaskId,
    dispatchedBy: job.dispatchedBy,
    parentDispatchId: job.parentDispatchId,
    depth: job.depth,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}
