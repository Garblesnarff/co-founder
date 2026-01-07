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
import { ValidationError } from '../../lib/errors.js';

// Single task schema (reuses existing add-task schema)
const taskInputSchema = z.object({
  task: nonEmptyStringSchema.describe('Clear, actionable task. Imperative: "Fix X" not "Should fix X"'),
  context: optionalStringSchema.describe('Why this matters, links, notes'),
  priority: prioritySchema.describe('0-10 (10=critical, 5=normal, 0=backlog). Default: 5'),
  estimatedMinutes: estimatedMinutesSchema.describe('Rough time estimate. Helps session planning.'),
  project: optionalProjectSchema.describe('infinite_realms, infrastructure, sanctuary, other'),
  blockedBy: blockedBySchema.describe('Task IDs that must complete first'),
  dueDate: isoDateStringSchema.describe('Deadline: "2025-01-15"'),
  tags: tagsSchema.describe('e.g., ["quick-win", "needs-rob", "backend"]'),
});

const inputSchema = z.object({
  tasks: z.array(taskInputSchema).min(1).max(20).describe('Array of tasks to add (1-20 tasks)'),
});

export const cofounderAddTasksTool = createMcpToolDefinition(
  'cofounder_add_tasks',
  `Batch add multiple tasks in one call. Use instead of calling cofounder_add_task multiple times.

Each task can have: task (required), context, priority (0-10), estimatedMinutes, project, blockedBy, dueDate, tags.

Example: Add 5 related tasks at once instead of 5 separate calls.`,
  inputSchema
);

export const handleCofounderAddTasks = createToolHandler(
  inputSchema,
  async (input, auth) => {
    if (input.tasks.length === 0) {
      throw new ValidationError('At least one task is required');
    }

    const added: Array<{
      id: number;
      task: string;
      priority: number;
      position: number;
    }> = [];

    // Add each task
    for (const taskInput of input.tasks) {
      const dueDate = taskInput.dueDate ? new Date(taskInput.dueDate) : null;

      const created = await addTask(
        taskInput.task,
        taskInput.priority,
        taskInput.project || null,
        taskInput.context || null,
        auth.userId || 'ai',
        taskInput.blockedBy,
        dueDate,
        taskInput.tags
      );

      await incrementTasksAssigned();

      // Get position in queue
      const queue = await getQueue();
      const position = queue.findIndex(t => t.id === created.id) + 1;

      added.push({
        id: created.id,
        task: taskInput.task,
        priority: taskInput.priority,
        position,
      });
    }

    const queueDepth = await getQueueDepth();

    return {
      added,
      count: added.length,
      queueDepth,
      message: `Added ${added.length} tasks to queue.`,
    };
  }
);
