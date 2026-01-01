import { db } from '../db/client.js';
import { dispatchJobs, type DispatchJob, type NewDispatchJob } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { env } from '../config/env.js';
import { slackClient } from '../slack/client.js';
import { runLocalAgent } from './runners/local-runner.js';

export interface QueueDispatchParams {
  agent: string;
  target: string;
  task: string;
  repoPath?: string;
  trackAsTask?: boolean;
  slackMessageTs?: string;
  slackChannelId?: string;
  slackThreadTs?: string;
  dispatchedBy?: string;
  parentDispatchId?: number;
  depth?: number;
}

/**
 * Queue a dispatch job
 */
export async function queueDispatch(params: QueueDispatchParams): Promise<DispatchJob> {
  const maxDepth = parseInt(env.DISPATCH_MAX_DEPTH || '5');

  // Check chain depth
  if ((params.depth || 0) >= maxDepth) {
    throw new Error(`Maximum dispatch chain depth (${maxDepth}) exceeded`);
  }

  const [job] = await db.insert(dispatchJobs).values({
    agent: params.agent,
    target: params.target,
    task: params.task,
    repoPath: params.repoPath || null,
    trackAsTask: params.trackAsTask || false,
    slackMessageTs: params.slackMessageTs || null,
    slackChannelId: params.slackChannelId || null,
    slackThreadTs: params.slackThreadTs || null,
    dispatchedBy: params.dispatchedBy || null,
    parentDispatchId: params.parentDispatchId || null,
    depth: params.depth || 0,
    status: 'pending',
  }).returning();

  // Process immediately for local targets
  if (params.target === 'hetzner') {
    processDispatchJob(job.id).catch(err => {
      console.error(`Error processing dispatch job ${job.id}:`, err);
    });
  }
  // Remote targets (mac, cold_storage) will be picked up by their respective listeners

  return job;
}

/**
 * Process a dispatch job
 */
export async function processDispatchJob(jobId: number): Promise<void> {
  const [job] = await db.select().from(dispatchJobs).where(eq(dispatchJobs.id, jobId));
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (job.status !== 'pending') {
    console.log(`Job ${jobId} is not pending (status: ${job.status}), skipping`);
    return;
  }

  // Update status to running
  await db.update(dispatchJobs)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(dispatchJobs.id, jobId));

  try {
    let result: string;

    if (job.target === 'hetzner') {
      // Run locally
      result = await runLocalAgent(job.agent, job.task, job.repoPath || undefined);
    } else {
      // Remote targets are handled by their own listeners
      // This shouldn't be called for remote targets
      throw new Error(`Cannot process remote target ${job.target} on Hetzner`);
    }

    // Update job as completed
    await db.update(dispatchJobs)
      .set({
        status: 'completed',
        result,
        completedAt: new Date(),
      })
      .where(eq(dispatchJobs.id, jobId));

    // Post result to Slack
    if (job.slackChannelId && job.slackThreadTs) {
      await postDispatchResult(job, result, true);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update job as failed
    await db.update(dispatchJobs)
      .set({
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(dispatchJobs.id, jobId));

    // Post error to Slack
    if (job.slackChannelId && job.slackThreadTs) {
      await postDispatchResult(job, errorMessage, false);
    }
  }
}

/**
 * Post dispatch result to Slack
 */
async function postDispatchResult(job: DispatchJob, result: string, success: boolean): Promise<void> {
  if (!job.slackChannelId || !job.slackThreadTs) return;

  const emoji = success ? '✅' : '❌';
  const status = success ? 'completed' : 'failed';

  // Truncate long results
  const maxLength = 3000;
  let displayResult = result;
  if (result.length > maxLength) {
    displayResult = result.slice(0, maxLength) + '\n... (truncated)';
  }

  const message = `${emoji} **${job.target}:${job.agent}** ${status}\n\n\`\`\`\n${displayResult}\n\`\`\``;

  try {
    await slackClient.postThreadReply(job.slackChannelId, job.slackThreadTs, message);

    // Add reaction to original message
    if (job.slackMessageTs) {
      await slackClient.addReaction(job.slackChannelId, job.slackMessageTs, success ? 'white_check_mark' : 'x');
    }
  } catch (error) {
    console.error('Error posting dispatch result to Slack:', error);
  }
}

/**
 * Get pending jobs for a specific target
 */
export async function getPendingJobs(target: string): Promise<DispatchJob[]> {
  return db.select()
    .from(dispatchJobs)
    .where(and(
      eq(dispatchJobs.target, target),
      eq(dispatchJobs.status, 'pending')
    ));
}

/**
 * Mark a job as picked up by a remote agent
 */
export async function markJobRunning(jobId: number): Promise<void> {
  await db.update(dispatchJobs)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(dispatchJobs.id, jobId));
}

/**
 * Complete a job from a remote agent
 */
export async function completeJob(jobId: number, result: string, success: boolean): Promise<void> {
  const [job] = await db.select().from(dispatchJobs).where(eq(dispatchJobs.id, jobId));
  if (!job) return;

  await db.update(dispatchJobs)
    .set({
      status: success ? 'completed' : 'failed',
      result: success ? result : null,
      errorMessage: success ? null : result,
      completedAt: new Date(),
    })
    .where(eq(dispatchJobs.id, jobId));

  // Post result to Slack
  if (job.slackChannelId && job.slackThreadTs) {
    await postDispatchResult({ ...job, result }, result, success);
  }
}
