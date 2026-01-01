import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getTaskById, removeTask, getTasksUnblockedBy, getQueueDepth, getNextUnblockedTask, removeBlockerFromTasks } from '../../services/queue-service.js';
import { completeTask } from '../../services/completion-service.js';
import { getState, clearCurrentTask, assignTask } from '../../services/state-service.js';

export const cofounderMarkDoneTool = {
  name: 'cofounder_mark_done',
  description: 'Retroactively mark a queued task as done. For tasks completed outside the system.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task to mark as done',
      },
      notes: {
        type: 'string',
        description: 'What was done / evidence of completion',
      },
      completedBy: {
        type: 'string',
        description: 'Who completed it: rob, claude, pre-existing, etc. (optional)',
      },
    },
    required: ['taskId', 'notes'],
  },
};

const inputSchema = z.object({
  taskId: z.number(),
  notes: z.string().min(1),
  completedBy: z.string().optional().default('unknown'),
});

export async function handleCofounderMarkDone(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  // Get task from queue
  const task = await getTaskById(input.taskId);
  if (!task) {
    throw new Error(`Task #${input.taskId} not found in queue`);
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
