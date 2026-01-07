import { z } from 'zod';
import { reprioritize, getTaskById, getQueue } from '../../services/queue-crud-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema, requiredPrioritySchema, optionalStringSchema } from '../../schemas/common.js';
import { NotFoundError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.describe('ID of the task to reprioritize'),
  newPriority: requiredPrioritySchema.describe('New priority (0-10)'),
  reason: optionalStringSchema.describe('Why the priority is changing (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderReprioritizeTool = createMcpToolDefinition(
  'cofounder_reprioritize',
  'Change the priority of a task in the queue.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderReprioritize = createToolHandler(
  inputSchema,
  async (input) => {
    const task = await getTaskById(input.taskId);
    if (!task) {
      throw new NotFoundError('Task', input.taskId);
    }

    const oldPriority = task.priority;
    await reprioritize(input.taskId, input.newPriority);

    // Get new position
    const queue = await getQueue();
    const newPosition = queue.findIndex(t => t.id === input.taskId) + 1;

    return {
      task: task.task,
      oldPriority,
      newPriority: input.newPriority,
      reason: input.reason || null,
      newQueuePosition: newPosition,
    };
  }
);
