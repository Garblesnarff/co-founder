import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getLearnings, searchLearnings, getLearningsByTag } from '../../services/learning-service.js';

export const cofounderGetLearningsTool = {
  name: 'cofounder_get_learnings',
  description: 'Get logged learnings, optionally filtered by category, tag, or search query.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string',
        description: 'Filter by category (optional)',
      },
      tag: {
        type: 'string',
        description: 'Filter by tag (optional)',
      },
      query: {
        type: 'string',
        description: 'Search query (optional)',
      },
      limit: {
        type: 'number',
        description: 'Max results to return (default 20)',
      },
    },
  },
};

const inputSchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().optional().default(20),
});

export async function handleCofounderGetLearnings(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

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
    learnings: learnings.map(l => ({
      id: l.id,
      content: l.content,
      category: l.category,
      tags: l.tags,
      source: l.source,
      createdAt: l.createdAt,
    })),
    count: learnings.length,
    filters: {
      category: input.category || null,
      tag: input.tag || null,
      query: input.query || null,
    },
  };
}
