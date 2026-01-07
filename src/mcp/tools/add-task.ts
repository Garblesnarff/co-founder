import { z } from 'zod';
import { addTask, getQueue, getQueueDepth } from '../../services/queue-crud-service.js';
import { incrementTasksAssigned } from '../../services/daily-log-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import {
  nonEmptyStringSchema,
  optionalStringSchema,
  prioritySchema,
  estimatedMinutesSchema,
  optionalProjectSchema,
  blockedBySchema,
  isoDateStringSchema,
  tagsSchema,
} from '../../schemas/common.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  task: nonEmptyStringSchema.describe('Clear, actionable task description'),
  context: optionalStringSchema.describe('Why this matters, links, notes (optional)'),
  priority: prioritySchema.describe('Priority 0-10 (10 = critical, 0 = low). Default 5.'),
  estimatedMinutes: estimatedMinutesSchema.describe('Estimated time in minutes (optional)'),
  project: optionalProjectSchema.describe('Project: infinite_realms, infrastructure, sanctuary, other'),
  blockedBy: blockedBySchema.describe('Array of task IDs that must complete before this task can start'),
  dueDate: isoDateStringSchema.describe('Optional deadline (ISO date string, e.g., "2025-01-15")'),
  tags: tagsSchema.describe('Tags for categorization: frontend, backend, quick-win, needs-rob, etc.'),
});

// Generate MCP tool definition from Zod schema
export const cofounderAddTaskTool = createMcpToolDefinition(
  'cofounder_add_task',
  `Add ONE task to queue. For multiple tasks, use cofounder_add_tasks (plural) to batch them in a single call.`,
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderAddTask = createToolHandler(
  inputSchema,
  async (input, auth) => {
    // Parse dueDate if provided
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;

    const created = await addTask(
      input.task,
      input.priority,
      input.project || null,
      input.context || null,
      auth.userId || 'ai',
      input.blockedBy,
      dueDate,
      input.tags
    );

    await incrementTasksAssigned();

    // Calculate position in queue
    const queue = await getQueue();
    const position = queue.findIndex(t => t.id === created.id) + 1;

    return {
      id: created.id,
      added: input.task,
      priority: input.priority,
      blockedBy: input.blockedBy.length > 0 ? input.blockedBy : null,
      dueDate: created.dueDate,
      tags: input.tags.length > 0 ? input.tags : null,
      queuePosition: position,
      queueDepth: await getQueueDepth(),
    };
  }
);
