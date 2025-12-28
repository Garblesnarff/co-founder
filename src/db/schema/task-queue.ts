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
}, (table) => [
  index('idx_task_queue_priority').on(table.priority),
]);

export type TaskQueueItem = typeof taskQueue.$inferSelect;
export type NewTaskQueueItem = typeof taskQueue.$inferInsert;
