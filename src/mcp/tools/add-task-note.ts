import { z } from 'zod';
import { addTaskNote, getTaskNoteCount } from '../../services/task-notes-service.js';
import { getState } from '../../services/state-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema, nonEmptyStringSchema, noteTypeEnum } from '../../schemas/common.js';
import { ConflictError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.optional().describe('Task ID (optional - defaults to current task)'),
  note: nonEmptyStringSchema.describe('The note content'),
  noteType: noteTypeEnum.default('progress').describe('Type: progress, attempt, blocker, or learning (default: progress)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderAddTaskNoteTool = createMcpToolDefinition(
  'cofounder_add_task_note',
  'Add a note to a task (progress update, attempt, blocker, or learning). Defaults to current task.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderAddTaskNote = createToolHandler(
  inputSchema,
  async (input) => {
    let taskId = input.taskId;
    const taskCompleted = false;

    // Default to current task if no taskId provided
    if (taskId === undefined) {
      const state = await getState();
      if (!state?.currentTaskId) {
        throw new ConflictError('No current task. Provide a taskId or claim a task first.');
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
);
