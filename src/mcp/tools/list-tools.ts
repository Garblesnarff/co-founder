import { z } from 'zod';
import { listTools, searchTools, getCategories } from '../../services/toolchain-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { optionalStringSchema, toolLimitSchema } from '../../schemas/common.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  category: optionalStringSchema.describe('Filter by category (image-gen, video-gen, audio, coding, etc.)'),
  project: optionalStringSchema.describe('Filter by project'),
  query: optionalStringSchema.describe('Search keyword (searches name, purpose, category, whenToUse)'),
  limit: toolLimitSchema.describe('Max tools to return (default 50)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderListToolsTool = createMcpToolDefinition(
  'cofounder_list_tools',
  'List tools in the toolchain. Filter by category or project, or search by keyword.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderListTools = createToolHandler(
  inputSchema,
  async (input) => {
    // If search query provided, use search
    if (input.query) {
      const tools = await searchTools(input.query, input.limit);
      const categories = await getCategories();

      return {
        tools,
        count: tools.length,
        searchQuery: input.query,
        availableCategories: categories,
      };
    }

    // Otherwise, list with filters
    const tools = await listTools({
      category: input.category,
      project: input.project,
      limit: input.limit,
    });

    const categories = await getCategories();

    return {
      tools,
      count: tools.length,
      filters: {
        category: input.category || null,
        project: input.project || null,
      },
      availableCategories: categories,
    };
  }
);
