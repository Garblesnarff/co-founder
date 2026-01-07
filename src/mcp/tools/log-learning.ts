import { z } from 'zod';
import { logLearning } from '../../services/learning-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, tagsSchema, optionalStringSchema } from '../../schemas/common.js';
import { mapLearning } from '../../lib/response-mappers.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  content: nonEmptyStringSchema.describe('The learning content - what you discovered or learned'),
  category: optionalStringSchema.describe('Category: tech, process, personal, workflow, etc. (optional)'),
  tags: tagsSchema.describe('Tags for categorization (optional)'),
  source: optionalStringSchema.describe('Where this learning came from (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderLogLearningTool = createMcpToolDefinition(
  'cofounder_log_learning',
  'Log a standalone learning or insight. For TIL moments that don\'t belong to a specific task.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderLogLearning = createToolHandler(
  inputSchema,
  async (input, auth) => {
    const learning = await logLearning(
      input.content,
      input.category || null,
      input.tags,
      input.source || null,
      auth.userId || 'ai'
    );

    return {
      ...mapLearning(learning),
      message: 'Learning logged successfully.',
    };
  }
);
