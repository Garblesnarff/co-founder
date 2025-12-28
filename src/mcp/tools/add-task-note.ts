import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { addTaskNote, getTaskNoteCount } from '../../services/task-notes-service.js';
import { getState } from '../../services/state-service.js';

export const cofounderAddTaskNoteTool = {
  name: 'cofounder_add_task_note',
  description: 'Add a note to a task (progress update, attempt, blocker, or learning). Defaults to current task.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      taskId: {
        type: 'number',
        description: 'Task ID (optional - defaults to current task)',
      },
      note: {
        type: 'string',
        description: 'The note content',
      },
      noteType: {
        type: 'string',
        description: 'Type: progress, attempt, blocker, or learning (default: progress)',
      },
    },
    required: ['note'],
  },
};

const inputSchema = z.object({
  taskId: z.number().optional(),
  note: z.string().min(1),
  noteType: z.enum(['progress', 'attempt', 'blocker', 'learning']).default('progress'),
});

export async function handleCofounderAddTaskNote(args: unknown, auth: AuthContext) {
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

  const created = await addTaskNote(
    taskId,
    input.note,
    input.noteType,
    taskCompleted,
    'ai'
  );

  const noteCount = await getTaskNoteCount(taskId, taskCompleted);

  return {
    added: {
      id: created.id,
      taskId: created.taskId,
      note: created.note,
      noteType: created.noteType,
      createdAt: created.createdAt,
    },
    totalNotes: noteCount,
  };
}
