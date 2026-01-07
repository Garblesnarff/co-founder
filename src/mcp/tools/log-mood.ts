import { z } from 'zod';
import { logMood } from '../../services/daily-log-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema } from '../../schemas/common.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  mood: nonEmptyStringSchema.describe('How you\'re feeling (free text)'),
  notes: optionalStringSchema.describe('Additional context (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderLogMoodTool = createMcpToolDefinition(
  'cofounder_log_mood',
  'Log how Rob is feeling. Helps AI calibrate task difficulty and messaging.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderLogMood = createToolHandler(
  inputSchema,
  async (input) => {
    await logMood(input.mood, input.notes || null);

    return {
      logged: true,
      mood: input.mood,
      message: 'Mood logged. Take care of yourself.',
    };
  }
);
