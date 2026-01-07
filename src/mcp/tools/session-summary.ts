import { z } from 'zod';
import { getActiveSession, endSession } from '../../services/session-service.js';
import { listCompletedTasks } from '../../services/completion-service.js';
import { getLearnings } from '../../services/learning-service.js';
import { getNextUnblockedTask } from '../../services/task-blocker-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { optionalStringSchema } from '../../schemas/common.js';
import { ConflictError } from '../../lib/errors.js';

const inputSchema = z.object({
  notes: optionalStringSchema.describe('Session summary/notes. What did you accomplish?'),
  learnings: optionalStringSchema.describe('Key insights from this session. TIL moments.'),
});

export const cofounderSessionSummaryTool = createMcpToolDefinition(
  'cofounder_session_summary',
  `All-in-one session end. Replaces the 3-call pattern:
  - cofounder_end_session
  - cofounder_list_completed
  - cofounder_get_learnings

Ends session, shows what was completed, learnings logged, and next task ready. Use this instead of calling those 3 separately.`,
  inputSchema
);

export const handleCofounderSessionSummary = createToolHandler(
  inputSchema,
  async (input) => {
    // 1. End the session
    const active = await getActiveSession();
    if (!active) {
      throw new ConflictError('No active session to end.');
    }

    const ended = await endSession(active.id, input.notes || null, input.learnings || null);

    const sessionStart = new Date(active.startedAt);
    const sessionEnd = ended!.endedAt!;
    const durationMs = sessionEnd.getTime() - sessionStart.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    // 2. Get tasks completed during this session
    const completedTasks = await listCompletedTasks(20, undefined, sessionStart);

    // 3. Get learnings logged during this session
    const allLearnings = await getLearnings(null, 50);
    const sessionLearnings = allLearnings.filter(l =>
      new Date(l.createdAt) >= sessionStart && new Date(l.createdAt) <= sessionEnd
    );

    // 4. Get next task ready to go
    const nextTask = await getNextUnblockedTask();

    return {
      // Session summary
      session: {
        id: ended!.id,
        startedAt: sessionStart,
        endedAt: sessionEnd,
        durationMinutes,
        tasksCompleted: ended!.tasksCompleted,
        notesLogged: ended!.notes ? 1 : 0,
        learningsLogged: sessionLearnings.length,
      },

      // Tasks completed during session
      completedTasks: completedTasks.map(t => ({
        task: t.task,
        completedAt: t.completedAt,
        timeTakenMinutes: t.timeTakenMinutes,
      })),

      // Learnings logged during session
      learnings: sessionLearnings.map(l => ({
        content: l.content,
        category: l.category,
        tags: l.tags,
      })),

      // Ready for next session
      nextTask: nextTask ? {
        id: nextTask.id,
        task: nextTask.task,
        context: nextTask.context,
        priority: nextTask.priority,
      } : null,

      message: `Session ended. ${durationMinutes} min, ${ended!.tasksCompleted} tasks, ${sessionLearnings.length} learnings.`,
    };
  }
);
