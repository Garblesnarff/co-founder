import { z } from 'zod';
import { searchTasks as searchTasksService, getTasksByTag } from '../../services/queue-search-service.js';
import { searchCompletedTasks } from '../../services/completion-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { searchQuerySchema, searchLimitSchema, optionalStringSchema } from '../../schemas/common.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  query: searchQuerySchema.describe('Search query'),
  includeCompleted: z.boolean().optional().default(false).describe('Include completed tasks (default false)'),
  tag: optionalStringSchema.describe('Filter by tag (optional)'),
  limit: searchLimitSchema.describe('Max results to return (default 20)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderSearchTasksTool = createMcpToolDefinition(
  'cofounder_search_tasks',
  'Search tasks by keyword in task description and context.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderSearchTasks = createToolHandler(
  inputSchema,
  async (input) => {
    // If searching by tag, use the tag-specific function
    if (input.tag) {
      const taggedTasks = await getTasksByTag(input.tag);
      // Filter by query within tagged results
      const filtered = taggedTasks.filter(t =>
        t.task.toLowerCase().includes(input.query.toLowerCase()) ||
        (t.context && t.context.toLowerCase().includes(input.query.toLowerCase()))
      ).slice(0, input.limit);

      return {
        query: input.query,
        tag: input.tag,
        queueResults: filtered.map(t => ({
          id: t.id,
          task: t.task,
          context: t.context,
          priority: t.priority,
          project: t.project,
          dueDate: t.dueDate,
          tags: t.tags,
        })),
        completedResults: [],
        totalFound: filtered.length,
      };
    }

    // Search queue
    const queueResults = await searchTasksService(input.query, input.limit);

    // Optionally search completed tasks
    let completedResults: any[] = [];
    if (input.includeCompleted) {
      completedResults = await searchCompletedTasks(input.query, input.limit);
    }

    return {
      query: input.query,
      queueResults: queueResults.map(t => ({
        id: t.id,
        task: t.task,
        context: t.context,
        priority: t.priority,
        project: t.project,
        dueDate: t.dueDate,
        tags: t.tags,
      })),
      completedResults: completedResults.map(t => ({
        id: t.id,
        task: t.task,
        completedAt: t.completedAt,
        project: t.project,
      })),
      totalFound: queueResults.length + completedResults.length,
    };
  }
);
