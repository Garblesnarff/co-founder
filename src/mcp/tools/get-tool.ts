import { z } from 'zod';
import { getToolById, getToolByName } from '../../services/toolchain-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { toolIdSchema, optionalStringSchema } from '../../schemas/common.js';

// Base schema for MCP tool definition (must be ZodObject, no refine)
const baseInputSchema = z.object({
  id: toolIdSchema.optional().describe('Tool ID'),
  name: optionalStringSchema.describe('Tool name (case-insensitive)'),
});

// Refined schema for handler validation (adds the id-or-name constraint)
const inputSchema = baseInputSchema.refine(
  (data) => data.id !== undefined || data.name !== undefined,
  { message: 'Either id or name must be provided' }
);

// Generate MCP tool definition from base Zod schema (without refine)
export const cofounderGetToolTool = createMcpToolDefinition(
  'cofounder_get_tool',
  'Get details of a specific tool by ID or name.',
  baseInputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetTool = createToolHandler(
  inputSchema,
  async (input) => {
    let tool = null;

    if (input.id !== undefined) {
      tool = await getToolById(input.id);
    } else if (input.name) {
      tool = await getToolByName(input.name);
    }

    if (!tool) {
      return {
        found: false,
        message: `Tool not found with ${input.id ? `ID ${input.id}` : `name "${input.name}"`}`,
      };
    }

    return {
      found: true,
      tool,
    };
  }
);
