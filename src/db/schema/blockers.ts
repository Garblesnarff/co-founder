import { pgTable, serial, text, timestamp, index } from 'drizzle-orm/pg-core';

export const blockers = pgTable('blockers', {
  id: serial('id').primaryKey(),
  blocker: text('blocker').notNull(),
  context: text('context'),
  identifiedAt: timestamp('identified_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolution: text('resolution'),
}, (table) => [
  index('idx_blockers_resolved').on(table.resolvedAt),
]);

export type Blocker = typeof blockers.$inferSelect;
export type NewBlocker = typeof blockers.$inferInsert;
