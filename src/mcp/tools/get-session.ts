import { z } from 'zod';
import { getActiveSession } from '../../services/session-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({});

// Generate MCP tool definition from Zod schema
export const cofounderGetSessionTool = createMcpToolDefinition(
  'cofounder_get_session',
  'Get the current active work session, if any.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetSession = createToolHandler(
  inputSchema,
  async () => {
    const session = await getActiveSession();

    if (!session) {
      return { active: false, message: 'No active session.' };
    }

    const elapsedMs = Date.now() - session.startedAt.getTime();
    const elapsedMinutes = Math.round(elapsedMs / 60000);
    const remainingMinutes = session.plannedDurationMinutes
      ? Math.max(0, session.plannedDurationMinutes - elapsedMinutes)
      : null;

    return {
      active: true,
      sessionId: session.id,
      startedAt: session.startedAt,
      elapsedMinutes,
      plannedMinutes: session.plannedDurationMinutes,
      remainingMinutes,
      tasksCompleted: session.tasksCompleted,
      energyLevel: session.energyLevel,
    };
  }
);
