import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState, recordCheckin } from '../../services/state-service.js';
import { getQueueDepth } from '../../services/queue-service.js';
import { getActiveBlockers } from '../../services/blocker-service.js';
import { incrementCheckins } from '../../services/daily-log-service.js';

export const cofounderCheckinTool = {
  name: 'cofounder_checkin',
  description: 'Check in at the start of any conversation about work. Returns current goal, task, streak, and status.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function handleCofounderCheckin(_args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const state = await getState();
  if (!state) {
    throw new Error('Founder state not initialized. Run seed script.');
  }

  await recordCheckin();
  await incrementCheckins();

  const queueDepth = await getQueueDepth();
  const activeBlockers = await getActiveBlockers();

  const hoursSinceAssigned = state.currentTaskAssignedAt
    ? (Date.now() - new Date(state.currentTaskAssignedAt).getTime()) / (1000 * 60 * 60)
    : null;

  return {
    goal: state.goal,
    goalMetric: state.goalMetric,
    currentTask: state.currentTask,
    currentTaskContext: state.currentTaskContext,
    assignedAt: state.currentTaskAssignedAt?.toISOString() || null,
    hoursSinceAssigned: hoursSinceAssigned ? Math.round(hoursSinceAssigned * 10) / 10 : null,
    streakDays: state.streakDays,
    status: state.status,
    queueDepth,
    blockers: activeBlockers.map(b => b.blocker),
  };
}
