import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { queueDispatch } from '../../dispatch/orchestrator.js';

export const dispatchTaskTool = {
  name: 'dispatch_task',
  description: 'Dispatch a task to an AI agent. Supports Claude, Gemini, Qwen, and Cline across Hetzner and Mac targets.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      agent: {
        type: 'string',
        enum: ['claude', 'gemini', 'qwen', 'cline'],
        description: 'AI agent to use',
      },
      task: {
        type: 'string',
        description: 'Task description for the agent',
      },
      target: {
        type: 'string',
        enum: ['hetzner', 'mac', 'cold_storage'],
        description: 'Target machine (default: hetzner)',
      },
      repoPath: {
        type: 'string',
        description: 'Optional: repository path for context',
      },
      trackAsTask: {
        type: 'boolean',
        description: 'Create a co-founder task to track this dispatch',
      },
      slackChannelName: {
        type: 'string',
        description: 'Optional: Slack channel to post updates to',
      },
    },
    required: ['agent', 'task'],
  },
};

const inputSchema = z.object({
  agent: z.enum(['claude', 'gemini', 'qwen', 'cline']),
  task: z.string(),
  target: z.enum(['hetzner', 'mac', 'cold_storage']).optional().default('hetzner'),
  repoPath: z.string().optional(),
  trackAsTask: z.boolean().optional().default(false),
  slackChannelName: z.string().optional(),
});

export async function handleDispatchTask(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

  // Validate agent/target combinations
  if (input.target === 'hetzner' && input.agent !== 'claude') {
    throw new Error(`Agent "${input.agent}" is only available on mac target. Use target: "mac" or agent: "claude"`);
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
