import { z } from 'zod';
import { db } from '../../db/client.js';
import { dispatchJobs } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { dispatchJobIdSchema } from '../../schemas/common.js';
import { NotFoundError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  jobId: dispatchJobIdSchema.describe('Dispatch job ID'),
});

// Generate MCP tool definition from Zod schema
export const dispatchStatusTool = createMcpToolDefinition(
  'dispatch_status',
  'Check the status of a dispatch job.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleDispatchStatus = createToolHandler(
  inputSchema,
  async (input) => {
    const [job] = await db.select()
      .from(dispatchJobs)
      .where(eq(dispatchJobs.id, input.jobId));

    if (!job) {
      throw new NotFoundError('Dispatch job', input.jobId);
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
);
