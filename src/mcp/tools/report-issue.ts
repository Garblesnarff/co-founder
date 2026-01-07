import { z } from 'zod';
import { reportIssue, getIssueStats } from '../../services/issues-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { issueTypeEnum, issuePrioritySchema, nonEmptyStringSchema } from '../../schemas/common.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  type: issueTypeEnum.describe('Type of issue: bug or feature'),
  title: nonEmptyStringSchema.describe('Short title for the issue'),
  description: nonEmptyStringSchema.describe('Detailed description of the bug or feature'),
  reportedBy: nonEmptyStringSchema.describe('Who is reporting: claude-opus, claude-sonnet, rob, etc.'),
  priority: issuePrioritySchema.describe('Priority 1-10 (10 = critical). Default 5.'),
});

// Generate MCP tool definition from Zod schema
export const cofounderReportIssueTool = createMcpToolDefinition(
  'cofounder_report_issue',
  'Report a bug or feature request for the co-founder MCP itself.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderReportIssue = createToolHandler(
  inputSchema,
  async (input) => {
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
);
