import { pgTable, serial, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const slackChannels = pgTable('slack_channels', {
  id: serial('id').primaryKey(),
  slackId: text('slack_id').unique().notNull(),
  name: text('name').notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_slack_channels_slack_id').on(table.slackId),
]);

export const slackMessages = pgTable('slack_messages', {
  id: serial('id').primaryKey(),
  slackId: text('slack_id').unique().notNull(), // message ts
  channelSlackId: text('channel_slack_id').notNull(),
  userId: text('user_id'),
  text: text('text'),
  threadTs: text('thread_ts'), // parent thread timestamp
  hasAttachments: boolean('has_attachments').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_slack_messages_channel').on(table.channelSlackId),
  index('idx_slack_messages_thread').on(table.threadTs),
]);

export const actionItems = pgTable('action_items', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  assignee: text('assignee'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  status: text('status').default('open').notNull(), // open, completed, blocked
  channelSlackId: text('channel_slack_id'),
  messageSlackId: text('message_slack_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_action_items_status').on(table.status),
]);

export type SlackChannel = typeof slackChannels.$inferSelect;
export type NewSlackChannel = typeof slackChannels.$inferInsert;
export type SlackMessage = typeof slackMessages.$inferSelect;
export type NewSlackMessage = typeof slackMessages.$inferInsert;
export type ActionItem = typeof actionItems.$inferSelect;
export type NewActionItem = typeof actionItems.$inferInsert;
