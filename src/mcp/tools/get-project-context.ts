import { z } from 'zod';
import { getProjectContext } from '../../services/project-context-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema } from '../../schemas/common.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  project: nonEmptyStringSchema.describe('Project name: infinite_realms, infrastructure, sanctuary, or other'),
});

// Generate MCP tool definition from Zod schema
export const cofounderGetProjectContextTool = createMcpToolDefinition(
  'cofounder_get_project_context',
  'Get persistent context/background for a project.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetProjectContext = createToolHandler(
  inputSchema,
  async (input) => {
    const context = await getProjectContext(input.project);

    if (!context) {
      return {
        project: input.project,
        exists: false,
        message: `No context found for project "${input.project}". Use update_project_context to create it.`,
      };
    }

    return {
      project: context.project,
      exists: true,
      overview: context.overview,
      currentState: context.currentState,
      keyFiles: context.keyFiles,
      techStack: context.techStack,
      moonshot: context.moonshot,
      updatedAt: context.updatedAt,
    };
  }
);
