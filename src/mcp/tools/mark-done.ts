import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getTaskById, removeTask, getTasksUnblockedBy, getQueueDepth } from '../../services/queue-service.js';
import { completeTask } from '../../services/completion-service.js';

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
    message: unblockedTasks.length > 0
      ? `Task #${task.id} marked done. Unblocked ${unblockedTasks.length} task(s).`
      : `Task #${task.id} marked done.`,
  };
}
