import { z } from 'zod';
import { getTaskById, getNextTask, removeTask, getQueueDepth } from '../../services/queue-crud-service.js';
import { getState, assignTask } from '../../services/state-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { taskIdSchema } from '../../schemas/common.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  taskId: taskIdSchema.optional().describe('ID of the task to claim (optional - if omitted, claims top of queue)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderClaimTaskTool = createMcpToolDefinition(
  'cofounder_claim_task',
  `Claim a task to work on. If no taskId provided, claims highest priority task.

For full session start (claim + start session + get notes), use cofounder_start_work instead.`,
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderClaimTask = createToolHandler(
  inputSchema,
  async (input) => {
    // Check if already have a current task
    const state = await getState();
    if (state?.currentTask) {
      throw new ConflictError(`Already have a task in progress: "${state.currentTask}". Complete it first.`);
    }

    let taskId = input.taskId;

    // If no taskId provided, claim top of queue
    if (taskId === undefined) {
      const next = await getNextTask();
      if (!next) {
        return { error: 'Queue empty. No tasks to claim.' };
      }
      taskId = next.id;
    }

    // Verify task exists
    const task = await getTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    // Claim the task: set as currentTask and remove from queue
    await assignTask(task.task, task.context, task.id);
    await removeTask(task.id);

    const queueRemaining = await getQueueDepth();
    const newState = await getState();

    return {
      claimed: {
        id: task.id,
        task: task.task,
        context: task.context,
        priority: task.priority,
        estimatedMinutes: task.estimatedMinutes,
        project: task.project,
      },
      streakDays: newState?.streakDays || 0,
      queueRemaining,
      message: `Now working on: ${task.task}`,
    };
  }
);
