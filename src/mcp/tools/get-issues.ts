import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getIssues, getIssueStats } from '../../services/issues-service.js';

export const cofounderGetIssuesTool = {
  name: 'cofounder_get_issues',
  description: 'Get reported issues for the co-founder MCP.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['open', 'in_progress', 'resolved', 'wontfix'],
        description: 'Filter by status (optional)',
      },
      type: {
        type: 'string',
        enum: ['bug', 'feature'],
        description: 'Filter by type (optional)',
      },
      limit: {
        type: 'number',
        description: 'Max issues to return (default 10)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'wontfix']).optional(),
  type: z.enum(['bug', 'feature']).optional(),
  limit: z.number().int().positive().max(50).optional().default(10),
});

export async function handleCofounderGetIssues(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const issues = await getIssues(input.status, input.type, input.limit);
  const stats = await getIssueStats();

  return {
    issues: issues.map(i => ({
      id: i.id,
      type: i.type,
      title: i.title,
      description: i.description,
      reportedBy: i.reportedBy,
      status: i.status,
      priority: i.priority,
      resolution: i.resolution,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
    count: issues.length,
    stats,
    filters: {
      status: input.status || null,
      type: input.type || null,
      limit: input.limit,
    },
  };
}
