import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { reportIssue, getIssueStats } from '../../services/issues-service.js';

export const cofounderReportIssueTool = {
  name: 'cofounder_report_issue',
  description: 'Report a bug or feature request for the co-founder MCP itself.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string',
        enum: ['bug', 'feature'],
        description: 'Type of issue: bug or feature',
      },
      title: {
        type: 'string',
        description: 'Short title for the issue',
      },
      description: {
        type: 'string',
        description: 'Detailed description of the bug or feature',
      },
      reportedBy: {
        type: 'string',
        description: 'Who is reporting: claude-opus, claude-sonnet, rob, etc.',
      },
      priority: {
        type: 'number',
        description: 'Priority 1-10 (10 = critical). Default 5.',
      },
    },
    required: ['type', 'title', 'description', 'reportedBy'],
  },
};

const inputSchema = z.object({
  type: z.enum(['bug', 'feature']),
  title: z.string().min(1),
  description: z.string().min(1),
  reportedBy: z.string().min(1),
  priority: z.number().min(1).max(10).optional().default(5),
});

export async function handleCofounderReportIssue(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  const issue = await reportIssue(
    input.type,
    input.title,
    input.description,
    input.reportedBy,
    input.priority
  );

  const stats = await getIssueStats();

  return {
    created: {
      id: issue.id,
      type: issue.type,
      title: issue.title,
      priority: issue.priority,
      status: issue.status,
    },
    message: `${input.type === 'bug' ? 'Bug' : 'Feature request'} #${issue.id} reported.`,
    openIssues: stats.open,
  };
}
