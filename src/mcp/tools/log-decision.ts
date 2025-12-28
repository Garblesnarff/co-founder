import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { logDecision } from '../../services/decision-service.js';

export const cofounderLogDecisionTool = {
  name: 'cofounder_log_decision',
  description: 'Record a key decision with rationale. Prevents relitigating decided issues.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      decision: {
        type: 'string',
        description: 'What was decided',
      },
      rationale: {
        type: 'string',
        description: 'Why this decision was made',
      },
      alternatives: {
        type: 'string',
        description: 'What other options were considered (optional)',
      },
      project: {
        type: 'string',
        description: 'Which project this applies to (optional)',
      },
      impact: {
        type: 'string',
        description: 'Expected outcome or impact (optional)',
      },
    },
    required: ['decision', 'rationale'],
  },
};

const inputSchema = z.object({
  decision: z.string().min(1),
  rationale: z.string().min(1),
  alternatives: z.string().optional(),
  project: z.string().optional(),
  impact: z.string().optional(),
});

export async function handleCofounderLogDecision(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const created = await logDecision(
    input.decision,
    input.rationale,
    input.alternatives || null,
    input.project || null,
    input.impact || null,
    'ai'
  );

  return {
    id: created.id,
    decision: created.decision,
    rationale: created.rationale,
    alternatives: created.alternatives,
    project: created.project,
    impact: created.impact,
    decidedAt: created.decidedAt,
  };
}
