import { z } from 'zod';
import { getState, recordCheckin } from '../../services/state-service.js';
import { getQueueDepth } from '../../services/queue-crud-service.js';
import { getActiveBlockers } from '../../services/blocker-service.js';
import { incrementCheckins } from '../../services/daily-log-service.js';
import { getActiveSession } from '../../services/session-service.js';
import { getTaskNoteCount } from '../../services/task-notes-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { PreconditionError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({});

// Generate MCP tool definition from Zod schema
export const cofounderCheckinTool = createMcpToolDefinition(
  'cofounder_checkin',
  `Start here. Returns current task, streak, session status, and queue depth. Call once at session start.

For a full session start with task claiming, use cofounder_start_work instead.`,
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderCheckin = createToolHandler(
  inputSchema,
  async () => {
    const state = await getState();
    if (!state) {
      throw new PreconditionError(
        'Founder state not initialized. Run seed script.',
        'state_initialized'
      );
    }

    await recordCheckin();
    await incrementCheckins();

    const queueDepth = await getQueueDepth();
    const activeBlockers = await getActiveBlockers();
    const activeSession = await getActiveSession();
    const taskNoteCount = state.currentTaskId
      ? await getTaskNoteCount(state.currentTaskId)
      : 0;

    const hoursSinceAssigned = state.currentTaskAssignedAt
      ? (Date.now() - new Date(state.currentTaskAssignedAt).getTime()) / (1000 * 60 * 60)
      : null;

    const sessionMinutes = activeSession
      ? Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / (1000 * 60))
      : null;

    return {
      goal: state.goal,
      goalMetric: state.goalMetric,
      currentTask: state.currentTask,
      currentTaskId: state.currentTaskId,
      currentTaskContext: state.currentTaskContext,
      assignedAt: state.currentTaskAssignedAt?.toISOString() || null,
      hoursSinceAssigned: hoursSinceAssigned ? Math.round(hoursSinceAssigned * 10) / 10 : null,
      streakDays: state.streakDays,
      status: state.status,
      queueDepth,
      blockers: activeBlockers.map(b => b.blocker),

      // Session details (saves needing to call get_session)
      session: activeSession ? {
        id: activeSession.id,
        minutesElapsed: sessionMinutes,
        plannedMinutes: activeSession.plannedDurationMinutes,
        remainingMinutes: activeSession.plannedDurationMinutes && sessionMinutes
          ? Math.max(0, activeSession.plannedDurationMinutes - sessionMinutes)
          : null,
      } : null,

      // Task notes count (indicates if history should be checked)
      taskNoteCount,
    };
  }
);
