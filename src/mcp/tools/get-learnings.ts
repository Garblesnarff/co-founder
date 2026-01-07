import { z } from 'zod';
import { getLearnings, searchLearnings, getLearningsByTag } from '../../services/learning-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { optionalStringSchema, searchLimitSchema } from '../../schemas/common.js';
import { mapLearnings } from '../../lib/response-mappers.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  category: optionalStringSchema.describe('Filter by category (optional)'),
  tag: optionalStringSchema.describe('Filter by tag (optional)'),
  query: optionalStringSchema.describe('Search query (optional)'),
  limit: searchLimitSchema.describe('Max results to return (default 20)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderGetLearningsTool = createMcpToolDefinition(
  'cofounder_get_learnings',
  'Get logged learnings, optionally filtered by category, tag, or search query.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetLearnings = createToolHandler(
  inputSchema,
  async (input) => {
    let learnings;

    if (input.query) {
      learnings = await searchLearnings(input.query, input.limit);
    } else if (input.tag) {
      learnings = await getLearningsByTag(input.tag);
      learnings = learnings.slice(0, input.limit);
    } else {
      learnings = await getLearnings(input.category || null, input.limit);
    }

    return {
      learnings: mapLearnings(learnings),
      count: learnings.length,
      filters: {
        category: input.category || null,
        tag: input.tag || null,
        query: input.query || null,
      },
    };
  }
);
