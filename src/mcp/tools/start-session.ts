import { z } from 'zod';
import { startSession } from '../../services/session-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { energyLevelEnum, plannedMinutesSchema } from '../../schemas/common.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  plannedMinutes: plannedMinutesSchema.describe('Planned session duration in minutes (optional)'),
  energyLevel: energyLevelEnum.optional().describe('Starting energy level: high, medium, or low (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderStartSessionTool = createMcpToolDefinition(
  'cofounder_start_session',
  'Start a new work session. Automatically ends any existing session.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderStartSession = createToolHandler(
  inputSchema,
  async (input) => {
    const session = await startSession(
      input.plannedMinutes || null,
      input.energyLevel || null
    );

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      plannedMinutes: session.plannedDurationMinutes,
      energyLevel: session.energyLevel,
      message: input.plannedMinutes
        ? `Session started. You have ${input.plannedMinutes} minutes planned.`
        : 'Session started.',
    };
  }
);
