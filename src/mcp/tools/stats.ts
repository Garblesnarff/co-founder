import { z } from 'zod';
import { getState } from '../../services/state-service.js';
import { getStats as getCompletionStats } from '../../services/completion-service.js';
import { getBlockerStats } from '../../services/blocker-service.js';
import { getQueueDepth } from '../../services/queue-crud-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';

// Define schema once with descriptions for MCP (empty object for no inputs)
const inputSchema = z.object({});

// Generate MCP tool definition from Zod schema
export const cofounderStatsTool = createMcpToolDefinition(
  'cofounder_stats',
  'Get progress statistics: tasks completed, streak, blockers, goal progress.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderStats = createToolHandler(
  inputSchema,
  async () => {
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
);
