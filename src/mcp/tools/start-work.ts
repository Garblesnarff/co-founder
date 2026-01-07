import { z } from 'zod';
import { getState, recordCheckin, assignTask } from '../../services/state-service.js';
import { getQueueDepth, getTaskById, getNextTask, removeTask } from '../../services/queue-crud-service.js';
import { getActiveBlockers } from '../../services/blocker-service.js';
import { incrementCheckins } from '../../services/daily-log-service.js';
import { getActiveSession, startSession } from '../../services/session-service.js';
import { getTaskNotes } from '../../services/task-notes-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema, energyLevelEnum, plannedMinutesSchema } from '../../schemas/common.js';
import { PreconditionError, ConflictError, NotFoundError } from '../../lib/errors.js';

const inputSchema = z.object({
  taskId: taskIdSchema.optional().describe('Task ID to claim. If omitted, claims highest priority task.'),
  plannedMinutes: plannedMinutesSchema.describe('Session duration in minutes. Good for timeboxing.'),
  energyLevel: energyLevelEnum.optional().describe('Your energy: high, medium, low. Helps calibrate task selection.'),
});

export const cofounderStartWorkTool = createMcpToolDefinition(
  'cofounder_start_work',
  `All-in-one session start. Replaces the 3-call pattern:
  - cofounder_checkin
  - cofounder_claim_task
  - cofounder_start_session

Returns task with notes, starts session, shows streak. Use this instead of calling those 3 separately.`,
  inputSchema
);

export const handleCofounderStartWork = createToolHandler(
  inputSchema,
  async (input) => {
    // 1. Check state (like checkin)
    const state = await getState();
    if (!state) {
      throw new PreconditionError(
        'Founder state not initialized. Run seed script.',
        'state_initialized'
      );
    }

    await recordCheckin();
    await incrementCheckins();

    // 2. Determine task to work on
    let task;
    let taskNotes: { id: number; note: string; noteType: string; createdAt: Date }[] = [];

    if (state.currentTask && state.currentTaskId) {
      // Already have a task - use it
      task = {
        id: state.currentTaskId,
        task: state.currentTask,
        context: state.currentTaskContext,
        priority: null,
        project: null,
        blockedBy: [] as number[],
        dueDate: null,
        tags: [] as string[],
        estimatedMinutes: null,
      };
      taskNotes = await getTaskNotes(state.currentTaskId);
    } else if (input.taskId) {
      // Specific task requested
      const requested = await getTaskById(input.taskId);
      if (!requested) {
        throw new NotFoundError('Task', input.taskId);
      }
      task = requested;
      await assignTask(task.task, task.context, task.id);
      await removeTask(task.id);
      taskNotes = await getTaskNotes(task.id);
    } else {
      // Get next from queue
      const next = await getNextTask();
      if (next) {
        task = next;
        await assignTask(task.task, task.context, task.id);
        await removeTask(task.id);
        taskNotes = await getTaskNotes(task.id);
      }
    }

    // 3. Start or get session
    let session = await getActiveSession();
    let sessionStarted = false;

    if (!session) {
      session = await startSession(
        input.plannedMinutes || null,
        input.energyLevel || null
      );
      sessionStarted = true;
    }

    // 4. Gather additional context
    const activeBlockers = await getActiveBlockers();
    const queueDepth = await getQueueDepth();
    const newState = await getState();

    const sessionMinutes = session
      ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / (1000 * 60))
      : 0;

    return {
      // Current task info
      task: task ? {
        id: task.id,
        task: task.task,
        context: task.context,
        priority: task.priority,
        project: task.project,
        blockedBy: task.blockedBy,
        dueDate: task.dueDate,
        tags: task.tags,
        estimatedMinutes: task.estimatedMinutes,
      } : null,

      // Previous notes on this task
      notes: taskNotes.map(n => ({
        type: n.noteType,
        note: n.note,
        at: n.createdAt,
      })),

      // Active blockers
      blockers: activeBlockers.map(b => b.blocker),

      // Session info
      session: {
        id: session.id,
        startedAt: session.startedAt,
        minutesElapsed: sessionMinutes,
        plannedMinutes: session.plannedDurationMinutes,
        justStarted: sessionStarted,
      },

      // Stats
      streakDays: newState?.streakDays || 0,
      queueRemaining: queueDepth,

      // Goal context
      goal: state.goal,
      goalMetric: state.goalMetric,
    };
  }
);
