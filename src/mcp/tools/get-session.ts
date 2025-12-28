import type { AuthContext } from '../../middleware/auth.js';
import { getActiveSession } from '../../services/session-service.js';

export const cofounderGetSessionTool = {
  name: 'cofounder_get_session',
  description: 'Get the current active work session, if any.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function handleCofounderGetSession(_args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const session = await getActiveSession();

  if (!session) {
    return { active: false, message: 'No active session.' };
  }

  const elapsedMs = Date.now() - session.startedAt.getTime();
  const elapsedMinutes = Math.round(elapsedMs / 60000);
  const remainingMinutes = session.plannedDurationMinutes
    ? Math.max(0, session.plannedDurationMinutes - elapsedMinutes)
    : null;

  return {
    active: true,
    sessionId: session.id,
    startedAt: session.startedAt,
    elapsedMinutes,
    plannedMinutes: session.plannedDurationMinutes,
    remainingMinutes,
    tasksCompleted: session.tasksCompleted,
    energyLevel: session.energyLevel,
  };
}
