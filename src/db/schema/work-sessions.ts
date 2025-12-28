import { pgTable, serial, integer, text, timestamp, index } from 'drizzle-orm/pg-core';

export const workSessions = pgTable('work_sessions', {
  id: serial('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  plannedDurationMinutes: integer('planned_duration_minutes'),
  tasksCompleted: integer('tasks_completed').default(0).notNull(),
  notes: text('notes'), // End-of-session summary
  learnings: text('learnings'), // Key insights
  energyLevel: text('energy_level'), // high, medium, low
}, (table) => [
  index('idx_work_sessions_ended').on(table.endedAt),
]);

export type WorkSession = typeof workSessions.$inferSelect;
export type NewWorkSession = typeof workSessions.$inferInsert;
