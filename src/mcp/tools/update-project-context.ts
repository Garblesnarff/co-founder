import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { updateProjectContext } from '../../services/project-context-service.js';

export const cofounderUpdateProjectContextTool = {
  name: 'cofounder_update_project_context',
  description: 'Update persistent context/background for a project. Creates if not exists.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project: {
        type: 'string',
        description: 'Project name: infinite_realms, infrastructure, sanctuary, or other',
      },
      overview: {
        type: 'string',
        description: 'What is this project? (optional)',
      },
      currentState: {
        type: 'string',
        description: 'Where are we now? Current status. (optional)',
      },
      keyFiles: {
        type: 'string',
        description: 'Important file paths to know about. (optional)',
      },
      techStack: {
        type: 'string',
        description: 'Technologies used in this project. (optional)',
      },
    },
    required: ['project'],
  },
};

const inputSchema = z.object({
  project: z.string().min(1),
  overview: z.string().optional(),
  currentState: z.string().optional(),
  keyFiles: z.string().optional(),
  techStack: z.string().optional(),
});

export async function handleCofounderUpdateProjectContext(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const updates: {
    overview?: string | null;
    currentState?: string | null;
    keyFiles?: string | null;
    techStack?: string | null;
  } = {};

  if (input.overview !== undefined) updates.overview = input.overview;
  if (input.currentState !== undefined) updates.currentState = input.currentState;
  if (input.keyFiles !== undefined) updates.keyFiles = input.keyFiles;
  if (input.techStack !== undefined) updates.techStack = input.techStack;

  if (Object.keys(updates).length === 0) {
    throw new Error('At least one field to update must be provided');
  }

  const updated = await updateProjectContext(input.project, updates);

  return {
    project: updated.project,
    overview: updated.overview,
    currentState: updated.currentState,
    keyFiles: updated.keyFiles,
    techStack: updated.techStack,
    updatedAt: updated.updatedAt,
  };
}
