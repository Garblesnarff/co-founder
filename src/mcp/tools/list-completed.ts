import { z } from 'zod';
import { listCompletedTasks } from '../../services/completion-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { queueLimitSchema, optionalStringSchema, sinceDateSchema } from '../../schemas/common.js';
import { mapCompletedTasks } from '../../lib/response-mappers.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  limit: queueLimitSchema.describe('Max tasks to return (default 10)'),
  project: optionalStringSchema.describe('Filter by project (optional)'),
  since: sinceDateSchema.describe('ISO date to filter from (e.g. "2025-12-01")'),
});

// Generate MCP tool definition from Zod schema
export const cofounderListCompletedTool = createMcpToolDefinition(
  'cofounder_list_completed',
  'List completed tasks for accountability and pattern analysis.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderListCompleted = createToolHandler(
  inputSchema,
  async (input) => {
    const sinceDate = input.since ? new Date(input.since) : undefined;

    const tasks = await listCompletedTasks(input.limit, input.project, sinceDate);

    return {
      tasks: mapCompletedTasks(tasks),
      count: tasks.length,
      filters: {
        limit: input.limit,
        project: input.project || null,
        since: input.since || null,
      },
    };
  }
);
