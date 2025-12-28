import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState } from '../../services/state-service.js';
import { getStats as getCompletionStats } from '../../services/completion-service.js';
import { getBlockerStats } from '../../services/blocker-service.js';
import { getQueueDepth } from '../../services/queue-service.js';

export const cofounderStatsTool = {
  name: 'cofounder_stats',
  description: 'Get progress statistics: tasks completed, streak, blockers, goal progress.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function handleCofounderStats(_args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const state = await getState();
  const completionStats = await getCompletionStats();
  const blockerStats = await getBlockerStats();
  const queueDepth = await getQueueDepth();

  // Calculate days since start (from first completion or state creation)
  const startDate = state?.lastCompletion || new Date();
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    goal: state?.goal || 'Not set',
    goalMetric: state?.goalMetric || 'Not set',
    currentRevenue: '$0/week', // TODO: Integrate with actual revenue tracking
    subscribers: 0, // TODO: Integrate with subscriber count
    targetSubscribers: 60,
    tasksCompletedTotal: completionStats.totalCompleted,
    tasksCompletedThisWeek: completionStats.completedThisWeek,
    tasksCompletedToday: completionStats.completedToday,
    streakDays: state?.streakDays || 0,
    daysSinceStart,
    queueDepth,
    blockersActive: blockerStats.active,
    blockersResolved: blockerStats.resolved,
    status: state?.status || 'unknown',
  };
}
