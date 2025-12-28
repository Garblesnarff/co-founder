import { pgTable, serial, text, timestamp, index } from 'drizzle-orm/pg-core';

export const decisions = pgTable('decisions', {
  id: serial('id').primaryKey(),
  decision: text('decision').notNull(), // What was decided
  rationale: text('rationale').notNull(), // Why
  alternatives: text('alternatives'), // What else was considered
  project: text('project'), // Which project
  impact: text('impact'), // Expected outcome
  decidedAt: timestamp('decided_at', { withTimezone: true }).defaultNow().notNull(),
  decidedBy: text('decided_by'), // "ai" or "human"
}, (table) => [
  index('idx_decisions_project').on(table.project),
  index('idx_decisions_date').on(table.decidedAt),
]);

export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;
