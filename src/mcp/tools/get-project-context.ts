import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getProjectContext } from '../../services/project-context-service.js';

export const cofounderGetProjectContextTool = {
  name: 'cofounder_get_project_context',
  description: 'Get persistent context/background for a project.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project: {
        type: 'string',
        description: 'Project name: infinite_realms, infrastructure, sanctuary, or other',
      },
    },
    required: ['project'],
  },
};

const inputSchema = z.object({
  project: z.string().min(1),
});

export async function handleCofounderGetProjectContext(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

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
    updatedAt: context.updatedAt,
  };
}
