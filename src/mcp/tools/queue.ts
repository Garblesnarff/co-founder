import { z } from 'zod';
import { getState } from '../../services/state-service.js';
import { getQueue, getTaskById } from '../../services/queue-crud-service.js';
import { isTaskBlocked } from '../../services/task-blocker-service.js';
import { getTasksByTag } from '../../services/queue-search-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { queueLimitSchema, optionalStringSchema, optionalProjectSchema } from '../../schemas/common.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  limit: queueLimitSchema.describe('Max number of tasks to return (default 10)'),
  tag: optionalStringSchema.describe('Filter by tag (optional)'),
  project: optionalProjectSchema.describe('Filter by project (optional)'),
  includeBlockerDetails: z.boolean().optional().default(false).describe('Include blocker task names (saves separate get_task calls)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderQueueTool = createMcpToolDefinition(
  'cofounder_queue',
  `View task queue by priority. Use includeBlockerDetails=true to get blocker task names without separate calls.`,
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderQueue = createToolHandler(
  inputSchema,
  async (input) => {
    const state = await getState();

    // Get queue, optionally filtered by tag
    let queue = input.tag
      ? await getTasksByTag(input.tag)
      : await getQueue();

    // Filter by project if provided
    if (input.project) {
      queue = queue.filter(t => t.project === input.project);
    }

    // Add blocked status to each task
    const tasksWithStatus = await Promise.all(
      queue.slice(0, input.limit).map(async t => {
        // Optionally include blocker task names
        let blockerDetails: { id: number; task: string }[] | undefined;
        if (input.includeBlockerDetails && t.blockedBy && t.blockedBy.length > 0) {
          blockerDetails = await Promise.all(
            t.blockedBy.map(async id => {
              const blocker = await getTaskById(id);
              return { id, task: blocker?.task || '(completed/deleted)' };
            })
          );
        }

        return {
          id: t.id,
          task: t.task,
          priority: t.priority,
          project: t.project,
          estimatedMinutes: t.estimatedMinutes,
          context: t.context,
          blockedBy: t.blockedBy,
          blockerDetails,
          isBlocked: await isTaskBlocked(t),
          dueDate: t.dueDate,
          tags: t.tags,
        };
      })
    );

    const blockedCount = tasksWithStatus.filter(t => t.isBlocked).length;
    const overdueTasks = tasksWithStatus.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;

    return {
      currentTask: state?.currentTask || null,
      currentTaskContext: state?.currentTaskContext || null,
      queue: tasksWithStatus,
      totalInQueue: queue.length,
      blockedCount,
      readyCount: tasksWithStatus.length - blockedCount,
      overdueCount: overdueTasks,
      filters: {
        tag: input.tag || null,
        project: input.project || null,
      },
    };
  }
);
