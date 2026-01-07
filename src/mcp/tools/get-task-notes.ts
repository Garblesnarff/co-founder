import { z } from 'zod';
import { getTaskNotes } from '../../services/task-notes-service.js';
import { getState } from '../../services/state-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema } from '../../schemas/common.js';
import { ConflictError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.optional().describe('Task ID (optional - defaults to current task)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderGetTaskNotesTool = createMcpToolDefinition(
  'cofounder_get_task_notes',
  'Get all notes for a task. Defaults to current task.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetTaskNotes = createToolHandler(
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
);
