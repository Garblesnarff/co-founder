import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState, updateProgress } from '../../services/state-service.js';

export const cofounderUpdateProgressTool = {
  name: 'cofounder_update_progress',
  description: 'Track actual revenue/subscribers toward goal.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      currentRevenue: {
        type: 'string',
        description: 'Current revenue (e.g. "$45/week")',
      },
      subscribers: {
        type: 'number',
        description: 'Current subscriber count',
      },
      notes: {
        type: 'string',
        description: 'Optional notes (e.g. "First paying customer!")',
      },
    },
    required: ['currentRevenue', 'subscribers'],
  },
};

const inputSchema = z.object({
  currentRevenue: z.string(),
  subscribers: z.number().int().min(0),
  notes: z.string().optional(),
});

export async function handleCofounderUpdateProgress(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const before = await getState();
  const updated = await updateProgress(input.currentRevenue, input.subscribers);

  return {
    goal: updated.goal,
    goalMetric: updated.goalMetric,
    progress: {
      currentRevenue: updated.currentRevenue,
      subscribers: updated.subscribers,
      lastUpdated: updated.lastProgressUpdate,
    },
    previous: {
      currentRevenue: before?.currentRevenue || null,
      subscribers: before?.subscribers || 0,
    },
    notes: input.notes || null,
  };
}
