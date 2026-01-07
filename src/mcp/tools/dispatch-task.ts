import { z } from 'zod';
import { queueDispatch } from '../../dispatch/orchestrator.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { agentEnum, dispatchTargetEnum, optionalStringSchema } from '../../schemas/common.js';
import { ValidationError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  agent: agentEnum.describe('AI agent to use'),
  task: z.string().describe('Task description for the agent'),
  target: dispatchTargetEnum.optional().default('hetzner').describe('Target machine (default: hetzner)'),
  repoPath: optionalStringSchema.describe('Optional: repository path for context'),
  trackAsTask: z.boolean().optional().default(false).describe('Create a co-founder task to track this dispatch'),
  slackChannelName: optionalStringSchema.describe('Optional: Slack channel to post updates to'),
});

const toolDescription = `Dispatch a task to an AI agent. Supports Claude, Gemini, Qwen, and Cline across Hetzner and Mac targets.

**Slack Dispatch Format:**
Post in a channel where the dispatch listener is active (e.g., #dev-dispatch):
  @dispatch [--track] [--repo=/path] [target:]agent: task

**Examples:**
  @dispatch claude: fix the TypeScript error in auth.ts
  @dispatch --repo=/var/www/pearls claude: add a new pearl_stats tool
  @dispatch mac:gemini: review the PR for memory leaks
  @dispatch --track --repo=/var/www/co-founder claude: implement the new feature

**Options:**
  --track: Create a co-founder task to track progress
  --repo=/path: Set working directory (use cofounder_list_tools category=codebase to find paths)
  target: hetzner (default), mac, or cold_storage
  agent: claude, gemini, qwen, or cline

**Important:** Only 'claude' works on Hetzner. Use 'mac:agent' for gemini/qwen/cline.`;

// Generate MCP tool definition from Zod schema
export const dispatchTaskTool = createMcpToolDefinition(
  'dispatch_task',
  toolDescription,
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleDispatchTask = createToolHandler(
  inputSchema,
  async (input) => {
    // Validate agent/target combinations
    if (input.target === 'hetzner' && input.agent !== 'claude') {
      throw new ValidationError(
        `Agent "${input.agent}" is only available on mac target. Use target: "mac" or agent: "claude"`,
        'agent'
      );
    }

    const job = await queueDispatch({
      agent: input.agent,
      target: input.target,
      task: input.task,
      repoPath: input.repoPath,
      trackAsTask: input.trackAsTask,
      dispatchedBy: 'mcp-tool',
    });

    return {
      success: true,
      jobId: job.id,
      agent: job.agent,
      target: job.target,
      task: job.task,
      status: job.status,
      message: `Dispatch job ${job.id} created for ${job.target}:${job.agent}`,
    };
  }
);
