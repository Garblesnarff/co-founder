import { pgTable, serial, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const completedTasks = pgTable('completed_tasks', {
  id: serial('id').primaryKey(),
  task: text('task').notNull(),
  context: text('context'),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  timeTakenMinutes: integer('time_taken_minutes'),
  notes: text('notes'),
  project: text('project'),
}, (table) => [
  index('idx_completed_tasks_date').on(table.completedAt),
]);

export type CompletedTask = typeof completedTasks.$inferSelect;
export type NewCompletedTask = typeof completedTasks.$inferInsert;
