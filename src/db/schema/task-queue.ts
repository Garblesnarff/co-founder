import { pgTable, serial, text, integer, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

export const taskQueue = pgTable('task_queue', {
  id: serial('id').primaryKey(),
  task: text('task').notNull(),
  context: text('context'),
  priority: integer('priority').default(0).notNull(),
  estimatedMinutes: integer('estimated_minutes'),
  project: text('project'), // infinite_realms, infrastructure, sanctuary, other
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  addedBy: text('added_by'),
  blockedBy: jsonb('blocked_by').$type<number[]>().default([]), // IDs of tasks that must complete first
  dueDate: timestamp('due_date', { withTimezone: true }), // Optional deadline for the task
  tags: jsonb('tags').$type<string[]>().default([]), // Flexible labels: frontend, backend, quick-win, etc.
  notionPageId: text('notion_page_id'), // Notion page ID for sync
}, (table) => [
  index('idx_task_queue_priority').on(table.priority),
  index('idx_task_queue_due_date').on(table.dueDate),
]);

export type TaskQueueItem = typeof taskQueue.$inferSelect;
export type NewTaskQueueItem = typeof taskQueue.$inferInsert;
