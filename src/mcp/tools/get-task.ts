import { z } from 'zod';
import { getTaskById } from '../../services/queue-crud-service.js';
import { isTaskBlocked } from '../../services/task-blocker-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema } from '../../schemas/common.js';
import { NotFoundError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.describe('ID of the task to retrieve'),
});

// Generate MCP tool definition from Zod schema
export const cofounderGetTaskTool = createMcpToolDefinition(
  'cofounder_get_task',
  'Get details of a specific task by ID.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetTask = createToolHandler(
  inputSchema,
  async (input) => {
    const task = await getTaskById(input.taskId);

    if (!task) {
      throw new NotFoundError('Task', input.taskId);
    }

    const blocked = await isTaskBlocked(task);

    return {
      id: task.id,
      task: task.task,
      context: task.context,
      priority: task.priority,
      project: task.project,
      estimatedMinutes: task.estimatedMinutes,
      addedAt: task.addedAt,
      addedBy: task.addedBy,
      blockedBy: task.blockedBy,
      isBlocked: blocked,
      dueDate: task.dueDate,
      tags: task.tags,
    };
  }
);
