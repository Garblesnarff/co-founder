import { z } from 'zod';
import { db } from '../../db/client.js';
import { dispatchJobs } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { dispatchJobIdSchema } from '../../schemas/common.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  jobId: dispatchJobIdSchema.describe('Dispatch job ID to cancel'),
});

// Generate MCP tool definition from Zod schema
export const dispatchCancelTool = createMcpToolDefinition(
  'dispatch_cancel',
  'Cancel a pending dispatch job.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleDispatchCancel = createToolHandler(
  inputSchema,
  async (input) => {
    const [job] = await db.select()
      .from(dispatchJobs)
      .where(eq(dispatchJobs.id, input.jobId));

    if (!job) {
      throw new NotFoundError('Dispatch job', input.jobId);
    }

    if (job.status !== 'pending') {
      throw new ConflictError(
        `Cannot cancel job with status "${job.status}". Only pending jobs can be cancelled.`,
        { currentStatus: job.status }
      );
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
);
