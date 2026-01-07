import { z } from 'zod';
import { updateProjectContext } from '../../services/project-context-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema } from '../../schemas/common.js';
import { ValidationError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  project: nonEmptyStringSchema.describe('Project name: infinite_realms, infrastructure, sanctuary, or other'),
  overview: optionalStringSchema.describe('What is this project? (optional)'),
  currentState: optionalStringSchema.describe('Where are we now? Current status. (optional)'),
  keyFiles: optionalStringSchema.describe('Important file paths to know about. (optional)'),
  techStack: optionalStringSchema.describe('Technologies used in this project. (optional)'),
  moonshot: optionalStringSchema.describe('Long-term vision, moonshot goals, multi-phase plans. (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderUpdateProjectContextTool = createMcpToolDefinition(
  'cofounder_update_project_context',
  'Update persistent context/background for a project. Creates if not exists.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderUpdateProjectContext = createToolHandler(
  inputSchema,
  async (input) => {
    const updates: {
      overview?: string | null;
      currentState?: string | null;
      keyFiles?: string | null;
      techStack?: string | null;
      moonshot?: string | null;
    } = {};

    if (input.overview !== undefined) updates.overview = input.overview;
    if (input.currentState !== undefined) updates.currentState = input.currentState;
    if (input.keyFiles !== undefined) updates.keyFiles = input.keyFiles;
    if (input.techStack !== undefined) updates.techStack = input.techStack;
    if (input.moonshot !== undefined) updates.moonshot = input.moonshot;

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one field to update must be provided');
    }

    const updated = await updateProjectContext(input.project, updates);

    return {
      project: updated.project,
      overview: updated.overview,
      currentState: updated.currentState,
      keyFiles: updated.keyFiles,
      techStack: updated.techStack,
      moonshot: updated.moonshot,
      updatedAt: updated.updatedAt,
    };
  }
);
