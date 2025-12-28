import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { startSession } from '../../services/session-service.js';

export const cofounderStartSessionTool = {
  name: 'cofounder_start_session',
  description: 'Start a new work session. Automatically ends any existing session.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      plannedMinutes: {
        type: 'number',
        description: 'Planned session duration in minutes (optional)',
      },
      energyLevel: {
        type: 'string',
        description: 'Starting energy level: high, medium, or low (optional)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  plannedMinutes: z.number().positive().optional(),
  energyLevel: z.enum(['high', 'medium', 'low']).optional(),
});

export async function handleCofounderStartSession(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const session = await startSession(
    input.plannedMinutes || null,
    input.energyLevel || null
  );

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    plannedMinutes: session.plannedDurationMinutes,
    energyLevel: session.energyLevel,
    message: input.plannedMinutes
      ? `Session started. You have ${input.plannedMinutes} minutes planned.`
      : 'Session started.',
  };
}
