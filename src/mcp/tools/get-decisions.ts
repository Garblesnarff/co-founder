import { z } from 'zod';
import { getDecisions } from '../../services/decision-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { optionalStringSchema, searchLimitSchema } from '../../schemas/common.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  project: optionalStringSchema.describe('Filter to specific project (optional)'),
  limit: searchLimitSchema.describe('Max decisions to return (default 20)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderGetDecisionsTool = createMcpToolDefinition(
  'cofounder_get_decisions',
  'Get recent decisions, optionally filtered by project.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderGetDecisions = createToolHandler(
  inputSchema,
  async (input) => {
    const decisions = await getDecisions(input.project || null, input.limit);

    return {
      project: input.project || 'all',
      decisions: decisions.map(d => ({
        id: d.id,
        decision: d.decision,
        rationale: d.rationale,
        alternatives: d.alternatives,
        project: d.project,
        impact: d.impact,
        decidedAt: d.decidedAt,
        decidedBy: d.decidedBy,
      })),
      count: decisions.length,
    };
  }
);
