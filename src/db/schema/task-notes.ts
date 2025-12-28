import { pgTable, serial, integer, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const taskNotes = pgTable('task_notes', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull(),
  taskCompleted: boolean('task_completed').default(false).notNull(), // false = task_queue, true = completed_tasks
  note: text('note').notNull(),
  noteType: text('note_type').default('progress').notNull(), // progress, attempt, blocker, learning
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by'), // "ai" or "human"
}, (table) => [
  index('idx_task_notes_task').on(table.taskId, table.taskCompleted),
]);

export type TaskNote = typeof taskNotes.$inferSelect;
export type NewTaskNote = typeof taskNotes.$inferInsert;
