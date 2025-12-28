import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getIssueById, updateIssue } from '../../services/issues-service.js';

export const cofounderUpdateIssueTool = {
  name: 'cofounder_update_issue',
  description: 'Update the status, resolution, or priority of an issue.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      issueId: {
        type: 'number',
        description: 'ID of the issue to update',
      },
      status: {
        type: 'string',
        enum: ['open', 'in_progress', 'resolved', 'wontfix'],
        description: 'New status (optional)',
      },
      resolution: {
        type: 'string',
        description: 'How the issue was resolved (optional)',
      },
      priority: {
        type: 'number',
        description: 'New priority 1-10 (optional)',
      },
    },
    required: ['issueId'],
  },
};

const inputSchema = z.object({
  issueId: z.number(),
  status: z.enum(['open', 'in_progress', 'resolved', 'wontfix']).optional(),
  resolution: z.string().nullable().optional(),
  priority: z.number().min(1).max(10).optional(),
});

export async function handleCofounderUpdateIssue(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  // Verify issue exists
  const existing = await getIssueById(input.issueId);
  if (!existing) {
    throw new Error(`Issue #${input.issueId} not found`);
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
  };
}
