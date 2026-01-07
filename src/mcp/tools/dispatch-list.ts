import { z } from 'zod';
import { db } from '../../db/client.js';
import { dispatchJobs } from '../../db/schema/index.js';
import { desc, eq, and } from 'drizzle-orm';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { dispatchStatusEnum, dispatchTargetEnum, queueLimitSchema } from '../../schemas/common.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  status: dispatchStatusEnum.optional().describe('Filter by status'),
  target: dispatchTargetEnum.optional().describe('Filter by target'),
  limit: queueLimitSchema.describe('Max jobs to return (default 10)'),
});

// Generate MCP tool definition from Zod schema
export const dispatchListTool = createMcpToolDefinition(
  'dispatch_list',
  'List recent dispatch jobs.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleDispatchList = createToolHandler(
  inputSchema,
  async (input) => {
    const conditions = [];
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
);
