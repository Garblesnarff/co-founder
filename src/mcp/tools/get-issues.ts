import { z } from 'zod';
import { getIssues, getIssueStats } from '../../services/issues-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { issueTypeEnum, issueStatusEnum, issueLimitSchema } from '../../schemas/common.js';
import { mapIssues } from '../../lib/response-mappers.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  status: issueStatusEnum.optional().describe('Filter by status (optional)'),
  type: issueTypeEnum.optional().describe('Filter by type (optional)'),
  limit: issueLimitSchema.describe('Max issues to return (default 10)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderGetIssuesTool = createMcpToolDefinition(
  'cofounder_get_issues',
  'Get reported issues for the co-founder MCP.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetIssues = createToolHandler(
  inputSchema,
  async (input) => {
    const issues = await getIssues(input.status, input.type, input.limit);
    const stats = await getIssueStats();

    return {
      issues: mapIssues(issues),
      count: issues.length,
      stats,
      filters: {
        status: input.status || null,
        type: input.type || null,
        limit: input.limit,
      },
    };
  }
);
