import { pgTable, serial, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const dispatchJobs = pgTable('dispatch_jobs', {
  id: serial('id').primaryKey(),

  // Slack context
  slackMessageTs: text('slack_message_ts'), // trigger message
  slackChannelId: text('slack_channel_id'),
  slackThreadTs: text('slack_thread_ts'),

  // Dispatch config
  agent: text('agent').notNull(), // claude, gemini, qwen, cline
  target: text('target').default('hetzner').notNull(), // hetzner, mac, cold_storage
  repoPath: text('repo_path'),
  task: text('task').notNull(),

  // Task tracking integration
  trackAsTask: boolean('track_as_task').default(false),
  cofounderTaskId: integer('cofounder_task_id'),

  // Status
  status: text('status').default('pending').notNull(), // pending, running, completed, failed
  result: text('result'),
  errorMessage: text('error_message'),

  // Dispatch chain (for AI-to-AI)
  dispatchedBy: text('dispatched_by'), // user_id or agent identifier
  parentDispatchId: integer('parent_dispatch_id'),
  depth: integer('depth').default(0).notNull(), // chain depth for loop prevention

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_dispatch_jobs_status').on(table.status),
  index('idx_dispatch_jobs_target').on(table.target),
  index('idx_dispatch_jobs_slack_thread').on(table.slackThreadTs),
]);

export type DispatchJob = typeof dispatchJobs.$inferSelect;
export type NewDispatchJob = typeof dispatchJobs.$inferInsert;
