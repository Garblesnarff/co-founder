import { z } from 'zod';
import { getIssueById, updateIssue } from '../../services/issues-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { issueIdSchema, issueStatusEnum } from '../../schemas/common.js';
import { NotFoundError } from '../../lib/errors.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  issueId: issueIdSchema.describe('ID of the issue to update'),
  status: issueStatusEnum.optional().describe('New status (optional)'),
  resolution: z.string().nullable().optional().describe('How the issue was resolved (optional)'),
  priority: z.number().int().min(1).max(10).optional().describe('New priority 1-10 (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderUpdateIssueTool = createMcpToolDefinition(
  'cofounder_update_issue',
  'Update the status, resolution, or priority of an issue.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderUpdateIssue = createToolHandler(
  inputSchema,
  async (input) => {
    // Verify issue exists
    const existing = await getIssueById(input.issueId);
    if (!existing) {
      throw new NotFoundError('Issue', input.issueId);
    }

    // Build updates
    const updates: {
      status?: string;
      resolution?: string | null;
      priority?: number;
    } = {};

    if (input.status !== undefined) updates.status = input.status;
    if (input.resolution !== undefined) updates.resolution = input.resolution;
    if (input.priority !== undefined) updates.priority = input.priority;

    if (Object.keys(updates).length === 0) {
      throw new Error('At least one field to update must be provided');
    }

    const updated = await updateIssue(input.issueId, updates);

    // Detect warning conditions for already-resolved issues
    let warning: string | undefined;
    if (existing.status === 'resolved' && input.status === undefined) {
      if (input.resolution !== undefined) {
        warning = 'Status unchanged (already resolved). Resolution text was overwritten.';
      } else if (input.priority !== undefined) {
        warning = 'Issue already resolved. Priority updated on resolved issue.';
      }
    }

    return {
      issueId: input.issueId,
      before: {
        status: existing.status,
        resolution: existing.resolution,
        priority: existing.priority,
      },
      after: {
        status: updated?.status,
        resolution: updated?.resolution,
        priority: updated?.priority,
      },
      message: input.status === 'resolved'
        ? `Issue #${input.issueId} resolved.`
        : `Issue #${input.issueId} updated.`,
      ...(warning && { warning }),
    };
  }
);
