import { z } from 'zod';
import { getState, assignTask, clearCurrentTask } from '../../services/state-service.js';
import { getQueueDepth, getQueue } from '../../services/queue-crud-service.js';
import { logBlocker } from '../../services/blocker-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema } from '../../schemas/common.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  blocker: nonEmptyStringSchema.describe('What is blocking progress'),
  context: optionalStringSchema.describe('Additional context about the blocker (optional)'),
  skipToNext: z.boolean().optional().default(true).describe('If true, skip current task and move to next in queue'),
});

// Generate MCP tool definition from Zod schema
export const cofounderBlockedTool = createMcpToolDefinition(
  'cofounder_blocked',
  'Report that you are blocked on the current task. Logs the blocker and optionally reassigns to a different task.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderBlocked = createToolHandler(
  inputSchema,
  async (input) => {
    const state = await getState();

    // Log the blocker
    await logBlocker(input.blocker, input.context || null);

    let recommendation: string;
    let newTask: string | null = null;
    let newTaskContext: string | null = null;

    if (input.skipToNext) {
      // Don't remove from queue - just skip
      // Get next task that isn't the current one
      const queue = await getQueue();
      const alternativeTask = queue.find(t => t.id !== state?.currentTaskId);

      if (alternativeTask) {
        await assignTask(alternativeTask.task, alternativeTask.context, alternativeTask.id);
        newTask = alternativeTask.task;
        newTaskContext = alternativeTask.context;
        recommendation = `Skip blocked task. Reassigning to: ${alternativeTask.task}`;
      } else {
        await clearCurrentTask();
        recommendation = 'No alternative tasks in queue. Add more tasks or resolve the blocker.';
      }
    } else {
      recommendation = 'Blocker logged. Current task unchanged. Resolve blocker to continue.';
    }

    return {
      blockerLogged: input.blocker,
      recommendation,
      newTask,
      newTaskContext,
      queueDepth: await getQueueDepth(),
    };
  }
);
