import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getTaskNotes } from '../../services/task-notes-service.js';
import { getState } from '../../services/state-service.js';

export const cofounderGetTaskNotesTool = {
  name: 'cofounder_get_task_notes',
  description: 'Get all notes for a task. Defaults to current task.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'Task ID (optional - defaults to current task)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  taskId: z.number().optional(),
});

export async function handleCofounderGetTaskNotes(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  let taskId = input.taskId;
  let taskCompleted = false;

  // Default to current task if no taskId provided
  if (taskId === undefined) {
    const state = await getState();
    if (!state?.currentTaskId) {
      throw new Error('No current task. Provide a taskId or claim a task first.');
    }
    taskId = state.currentTaskId;
  }

  const notes = await getTaskNotes(taskId, taskCompleted);

  return {
    taskId,
    notes: notes.map(n => ({
      id: n.id,
      note: n.note,
      noteType: n.noteType,
      createdAt: n.createdAt,
      createdBy: n.createdBy,
    })),
    count: notes.length,
  };
}
