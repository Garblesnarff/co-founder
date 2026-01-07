import { z } from 'zod';
import { getState, updateProgress } from '../../services/state-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema } from '../../schemas/common.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  currentRevenue: nonEmptyStringSchema.describe('Current revenue (e.g. "$45/week")'),
  subscribers: z.number().int().min(0).describe('Current subscriber count'),
  notes: optionalStringSchema.describe('Optional notes (e.g. "First paying customer!")'),
});

// Generate MCP tool definition from Zod schema
export const cofounderUpdateProgressTool = createMcpToolDefinition(
  'cofounder_update_progress',
  'Track actual revenue/subscribers toward goal.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderUpdateProgress = createToolHandler(
  inputSchema,
  async (input) => {
    const before = await getState();
    const updated = await updateProgress(input.currentRevenue, input.subscribers);

    return {
      goal: updated.goal,
      goalMetric: updated.goalMetric,
      progress: {
        currentRevenue: updated.currentRevenue,
        subscribers: updated.subscribers,
        lastUpdated: updated.lastProgressUpdate,
      },
      previous: {
        currentRevenue: before?.currentRevenue || null,
        subscribers: before?.subscribers || 0,
      },
      notes: input.notes || null,
    };
  }
);
