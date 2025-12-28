import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { logMood } from '../../services/daily-log-service.js';

export const cofounderLogMoodTool = {
  name: 'cofounder_log_mood',
  description: 'Log how Rob is feeling. Helps AI calibrate task difficulty and messaging.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mood: {
        type: 'string',
        description: 'How you\'re feeling (free text)',
      },
      notes: {
        type: 'string',
        description: 'Additional context (optional)',
      },
    },
    required: ['mood'],
  },
};

const inputSchema = z.object({
  mood: z.string(),
  notes: z.string().optional(),
});

export async function handleCofounderLogMood(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);
  await logMood(input.mood, input.notes || null);

  return {
    logged: true,
    mood: input.mood,
    message: 'Mood logged. Take care of yourself.',
  };
}
