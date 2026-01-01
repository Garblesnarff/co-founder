import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { db } from '../../db/client.js';
import { dispatchJobs } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

export const dispatchCancelTool = {
  name: 'dispatch_cancel',
  description: 'Cancel a pending dispatch job.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      jobId: {
        type: 'number',
        description: 'Dispatch job ID to cancel',
      },
    },
    required: ['jobId'],
  },
};

const inputSchema = z.object({
  jobId: z.number(),
});

export async function handleDispatchCancel(args: unknown, auth: AuthContext) {
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

  if (job.status !== 'pending') {
    throw new Error(`Cannot cancel job with status "${job.status}". Only pending jobs can be cancelled.`);
  }

  await db.update(dispatchJobs)
    .set({
      status: 'failed',
      errorMessage: 'Cancelled by user',
      completedAt: new Date(),
    })
    .where(eq(dispatchJobs.id, input.jobId));

  return {
    success: true,
    jobId: input.jobId,
    message: `Dispatch job ${input.jobId} cancelled`,
  };
}
