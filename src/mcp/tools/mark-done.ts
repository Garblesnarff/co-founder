import { z } from 'zod';
import { getTaskById, removeTask, getQueueDepth } from '../../services/queue-crud-service.js';
import { getTasksUnblockedBy, getNextUnblockedTask, removeBlockerFromTasks } from '../../services/task-blocker-service.js';
import { completeTask } from '../../services/completion-service.js';
import { getState, clearCurrentTask, assignTask } from '../../services/state-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema, nonEmptyStringSchema } from '../../schemas/common.js';
import { NotFoundError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.describe('ID of the task to mark as done'),
  notes: nonEmptyStringSchema.describe('What was done / evidence of completion'),
  completedBy: z.string().optional().default('unknown').describe('Who completed it: rob, claude, pre-existing, etc. (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderMarkDoneTool = createMcpToolDefinition(
  'cofounder_mark_done',
  'Retroactively mark a queued task as done. For tasks completed outside the system.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderMarkDone = createToolHandler(
  inputSchema,
  async (input) => {
    // Get task from queue
    const task = await getTaskById(input.taskId);
    if (!task) {
      throw new NotFoundError('Task', input.taskId);
    }

    // Check what tasks will be unblocked BEFORE removing
    const unblockedTasks = await getTasksUnblockedBy(input.taskId);

    // Log to completed_tasks
    await completeTask(
      task.task,
      task.context,
      null, // timeTakenMinutes unknown
      `[Marked done by ${input.completedBy}] ${input.notes}`,
      task.project
    );

    // Remove from queue
    await removeTask(input.taskId);

    // Auto-unblock: Remove this task ID from all blockedBy arrays
    await removeBlockerFromTasks(input.taskId);

    // Check if the marked-done task was the current task - if so, update state
    const state = await getState();
    let newTask: { id: number; task: string; context: string | null } | null = null;
    let wasCurrentTask = false;

    if (state?.currentTaskId === input.taskId) {
      wasCurrentTask = true;
      // Get next unblocked task
      const nextTask = await getNextUnblockedTask();

      if (nextTask) {
        await assignTask(nextTask.task, nextTask.context, nextTask.id);
        newTask = nextTask;
      } else {
        await clearCurrentTask();
      }
    }

    const queueRemaining = await getQueueDepth();

    return {
      markedDone: {
        id: task.id,
        task: task.task,
        project: task.project,
      },
      completedBy: input.completedBy,
      notes: input.notes,
      unblockedTasks: unblockedTasks.map(t => ({ id: t.id, task: t.task })),
      queueRemaining,
      ...(wasCurrentTask && {
        newTask: newTask?.task || null,
        newTaskContext: newTask?.context || null,
      }),
      message: unblockedTasks.length > 0
        ? `Task #${task.id} marked done. Unblocked ${unblockedTasks.length} task(s).`
        : wasCurrentTask && newTask
          ? `Task #${task.id} marked done. Next: ${newTask.task}`
          : wasCurrentTask
            ? `Task #${task.id} marked done. Queue empty.`
            : `Task #${task.id} marked done.`,
    };
  }
);
