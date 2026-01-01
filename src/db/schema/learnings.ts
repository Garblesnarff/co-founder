import { pgTable, serial, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

export const learnings = pgTable('learnings', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  category: text('category'), // tech, process, personal, workflow, etc.
  tags: jsonb('tags').$type<string[]>().default([]),
  source: text('source'), // Where did this learning come from? (task, session, discovery)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by'),
}, (table) => [
  index('idx_learnings_category').on(table.category),
  index('idx_learnings_created_at').on(table.createdAt),
]);

export type Learning = typeof learnings.$inferSelect;
export type NewLearning = typeof learnings.$inferInsert;
