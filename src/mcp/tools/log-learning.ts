import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { logLearning } from '../../services/learning-service.js';

export const cofounderLogLearningTool = {
  name: 'cofounder_log_learning',
  description: 'Log a standalone learning or insight. For TIL moments that don\'t belong to a specific task.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      content: {
        type: 'string',
        description: 'The learning content - what you discovered or learned',
      },
      category: {
        type: 'string',
        description: 'Category: tech, process, personal, workflow, etc. (optional)',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorization (optional)',
      },
      source: {
        type: 'string',
        description: 'Where this learning came from (optional)',
      },
    },
    required: ['content'],
  },
};

const inputSchema = z.object({
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  source: z.string().optional(),
});

export async function handleCofounderLogLearning(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const learning = await logLearning(
    input.content,
    input.category || null,
    input.tags,
    input.source || null,
    auth.userId || 'ai'
  );

  return {
    id: learning.id,
    content: learning.content,
    category: learning.category,
    tags: learning.tags,
    source: learning.source,
    createdAt: learning.createdAt,
    message: 'Learning logged successfully.',
  };
}
