import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getTaskById, updateTask } from '../../services/queue-service.js';

export const cofounderUpdateTaskTool = {
  name: 'cofounder_update_task',
  description: 'Update details of an existing task in the queue.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task to update',
      },
      task: {
        type: 'string',
        description: 'New task description (optional)',
      },
      context: {
        type: 'string',
        description: 'Updated context/notes (optional)',
      },
      estimatedMinutes: {
        type: 'number',
        description: 'Updated time estimate in minutes (optional)',
      },
      project: {
        type: 'string',
        description: 'Updated project: infinite_realms, infrastructure, sanctuary, other (optional)',
      },
      blockedBy: {
        type: 'array',
        items: { type: 'number' },
        description: 'Updated list of task IDs that must complete first',
      },
      dueDate: {
        type: 'string',
        description: 'Updated deadline (ISO date string). Use null to clear.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated tags for categorization',
      },
    },
    required: ['taskId'],
  },
};

const inputSchema = z.object({
  taskId: z.number(),
  task: z.string().optional(),
  context: z.string().nullable().optional(),
  estimatedMinutes: z.number().nullable().optional(),
  project: z.string().nullable().optional(),
  blockedBy: z.array(z.number()).optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export async function handleCofounderUpdateTask(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  // Verify task exists
  const existing = await getTaskById(input.taskId);
  if (!existing) {
    throw new Error(`Task ${input.taskId} not found`);
  }

  // Build updates object (only include provided fields)
  const updates: {
    task?: string;
    context?: string | null;
    estimatedMinutes?: number | null;
    project?: string | null;
    blockedBy?: number[];
    dueDate?: Date | null;
    tags?: string[];
  } = {};

  if (input.task !== undefined) updates.task = input.task;
  if (input.context !== undefined) updates.context = input.context;
  if (input.estimatedMinutes !== undefined) updates.estimatedMinutes = input.estimatedMinutes;
  if (input.project !== undefined) updates.project = input.project;
  if (input.blockedBy !== undefined) updates.blockedBy = input.blockedBy;
  if (input.dueDate !== undefined) {
    updates.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.tags !== undefined) updates.tags = input.tags;

  // Require at least one update
  if (Object.keys(updates).length === 0) {
    throw new Error('At least one field to update must be provided');
  }

  const updated = await updateTask(input.taskId, updates);

  return {
    taskId: input.taskId,
    before: {
      task: existing.task,
      context: existing.context,
      estimatedMinutes: existing.estimatedMinutes,
      project: existing.project,
      blockedBy: existing.blockedBy,
      dueDate: existing.dueDate,
      tags: existing.tags,
    },
    after: {
      task: updated?.task,
      context: updated?.context,
      estimatedMinutes: updated?.estimatedMinutes,
      project: updated?.project,
      blockedBy: updated?.blockedBy,
      dueDate: updated?.dueDate,
      tags: updated?.tags,
    },
  };
}
