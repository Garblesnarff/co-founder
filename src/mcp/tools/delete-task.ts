import { z } from 'zod';
import { getTaskById, deleteTask, getQueueDepth } from '../../services/queue-crud-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema, optionalStringSchema } from '../../schemas/common.js';
import { NotFoundError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.describe('ID of the task to delete'),
  reason: optionalStringSchema.describe('Why the task is being deleted (optional, for logging)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderDeleteTaskTool = createMcpToolDefinition(
  'cofounder_delete_task',
  'Delete a task from the queue (e.g., if it became obsolete).',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderDeleteTask = createToolHandler(
  inputSchema,
  async (input) => {
    // Verify task exists
    const existing = await getTaskById(input.taskId);
    if (!existing) {
      throw new NotFoundError('Task', input.taskId);
    }

    const deleted = await deleteTask(input.taskId);
    const queueDepth = await getQueueDepth();

    return {
      deleted: {
        id: deleted?.id,
        task: deleted?.task,
        context: deleted?.context,
        priority: deleted?.priority,
      },
      reason: input.reason || null,
      queueDepth,
    };
  }
);
