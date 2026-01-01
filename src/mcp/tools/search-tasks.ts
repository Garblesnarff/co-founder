import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { searchTasks as searchTasksService, getTasksByTag } from '../../services/queue-service.js';
import { searchCompletedTasks } from '../../services/completion-service.js';

export const cofounderSearchTasksTool = {
  name: 'cofounder_search_tasks',
  description: 'Search tasks by keyword in task description and context.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed tasks (default false)',
      },
      tag: {
        type: 'string',
        description: 'Filter by tag (optional)',
      },
      limit: {
        type: 'number',
        description: 'Max results to return (default 20)',
      },
    },
    required: ['query'],
  },
};

const inputSchema = z.object({
  query: z.string().min(1),
  includeCompleted: z.boolean().optional().default(false),
  tag: z.string().optional(),
  limit: z.number().optional().default(20),
});

export async function handleCofounderSearchTasks(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

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
