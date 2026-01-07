import { z } from 'zod';
import { getActiveSession, endSession } from '../../services/session-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { optionalStringSchema } from '../../schemas/common.js';
import { ConflictError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  notes: optionalStringSchema.describe('Session summary/notes (optional)'),
  learnings: optionalStringSchema.describe('Key insights from this session (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderEndSessionTool = createMcpToolDefinition(
  'cofounder_end_session',
  'End the current work session with optional notes and learnings.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderEndSession = createToolHandler(
  inputSchema,
  async (input) => {
    const active = await getActiveSession();
    if (!active) {
      throw new ConflictError('No active session to end.');
    }

    const ended = await endSession(active.id, input.notes || null, input.learnings || null);

    const durationMs = ended!.endedAt!.getTime() - ended!.startedAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    return {
      sessionId: ended!.id,
      startedAt: ended!.startedAt,
      endedAt: ended!.endedAt,
      durationMinutes,
      tasksCompleted: ended!.tasksCompleted,
      notes: ended!.notes,
      learnings: ended!.learnings,
      message: `Session ended. ${durationMinutes} minutes, ${ended!.tasksCompleted} tasks completed.`,
    };
  }
);
