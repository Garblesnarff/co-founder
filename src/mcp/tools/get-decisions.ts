import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getDecisions } from '../../services/decision-service.js';

export const cofounderGetDecisionsTool = {
  name: 'cofounder_get_decisions',
  description: 'Get recent decisions, optionally filtered by project.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project: {
        type: 'string',
        description: 'Filter to specific project (optional)',
      },
      limit: {
        type: 'number',
        description: 'Max decisions to return (default 20)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  project: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

export async function handleCofounderGetDecisions(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const decisions = await getDecisions(input.project || null, input.limit);

  return {
    project: input.project || 'all',
    decisions: decisions.map(d => ({
      id: d.id,
      decision: d.decision,
      rationale: d.rationale,
      alternatives: d.alternatives,
      project: d.project,
      impact: d.impact,
      decidedAt: d.decidedAt,
      decidedBy: d.decidedBy,
    })),
    count: decisions.length,
  };
}
