import { z } from 'zod';
import { getTaskById, updateTask } from '../../services/queue-crud-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import {
  taskIdSchema,
  optionalStringSchema,
  nullableOptionalStringSchema,
  nullableEstimatedMinutesSchema,
  nullableProjectSchema,
  dueDateSchema,
} from '../../schemas/common.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.describe('ID of the task to update'),
  task: optionalStringSchema.describe('New task description (optional)'),
  context: nullableOptionalStringSchema.describe('Updated context/notes (optional)'),
  estimatedMinutes: nullableEstimatedMinutesSchema.describe('Updated time estimate in minutes (optional)'),
  project: nullableProjectSchema.describe('Updated project: infinite_realms, infrastructure, sanctuary, other (optional)'),
  blockedBy: z.array(z.number()).optional().describe('Updated list of task IDs that must complete first'),
  dueDate: dueDateSchema.describe('Updated deadline (ISO date string). Use null to clear.'),
  tags: z.array(z.string()).optional().describe('Updated tags for categorization'),
});

// Generate MCP tool definition from Zod schema
export const cofounderUpdateTaskTool = createMcpToolDefinition(
  'cofounder_update_task',
  'Update details of an existing task in the queue.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderUpdateTask = createToolHandler(
  inputSchema,
  async (input) => {
    // Verify task exists
    const existing = await getTaskById(input.taskId);
    if (!existing) {
      throw new NotFoundError('Task', input.taskId);
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
      throw new ValidationError('At least one field to update must be provided');
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
);
