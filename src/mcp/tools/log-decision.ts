import { z } from 'zod';
import { logDecision } from '../../services/decision-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema } from '../../schemas/common.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  decision: nonEmptyStringSchema.describe('What was decided'),
  rationale: nonEmptyStringSchema.describe('Why this decision was made'),
  alternatives: optionalStringSchema.describe('What other options were considered (optional)'),
  project: optionalStringSchema.describe('Which project this applies to (optional)'),
  impact: optionalStringSchema.describe('Expected outcome or impact (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderLogDecisionTool = createMcpToolDefinition(
  'cofounder_log_decision',
  'Record a key decision with rationale. Prevents relitigating decided issues.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderLogDecision = createToolHandler(
  inputSchema,
  async (input, auth) => {
    const created = await logDecision(
      input.decision,
      input.rationale,
      input.alternatives || null,
      input.project || null,
      input.impact || null,
      auth.userId || 'ai'
    );

    return {
      id: created.id,
      decision: created.decision,
      rationale: created.rationale,
      alternatives: created.alternatives,
      project: created.project,
      impact: created.impact,
      decidedAt: created.decidedAt,
    };
  }
);
