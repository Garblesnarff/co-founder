import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getActiveSession, endSession } from '../../services/session-service.js';

export const cofounderEndSessionTool = {
  name: 'cofounder_end_session',
  description: 'End the current work session with optional notes and learnings.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      notes: {
        type: 'string',
        description: 'Session summary/notes (optional)',
      },
      learnings: {
        type: 'string',
        description: 'Key insights from this session (optional)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  notes: z.string().optional(),
  learnings: z.string().optional(),
});

export async function handleCofounderEndSession(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const active = await getActiveSession();
  if (!active) {
    return { error: 'No active session to end.' };
  }

  const ended = await endSession(active.id, input.notes || null, input.learnings || null);

  const durationMs = ended!.endedAt!.getTime() - ended!.startedAt.getTime();
  const durationMinutes = Math.round(durationMs / 60000);

  return {
    sessionId: ended!.id,
    startedAt: ended!.startedAt,
    endedAt: ended!.endedAt,
    durationMinutes,
    tasksCompleted: ended!.tasksCompleted,
    notes: ended!.notes,
    learnings: ended!.learnings,
    message: `Session ended. ${durationMinutes} minutes, ${ended!.tasksCompleted} tasks completed.`,
  };
}
