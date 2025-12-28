import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const founderState = pgTable('founder_state', {
  id: integer('id').primaryKey().default(1),
  goal: text('goal').notNull(),
  goalMetric: text('goal_metric').notNull(),
  currentTask: text('current_task'),
  currentTaskAssignedAt: timestamp('current_task_assigned_at', { withTimezone: true }),
  currentTaskContext: text('current_task_context'),
  currentTaskId: integer('current_task_id'),
  streakDays: integer('streak_days').default(0).notNull(),
  lastCheckin: timestamp('last_checkin', { withTimezone: true }),
  lastCompletion: timestamp('last_completion', { withTimezone: true }),
  status: text('status').default('active').notNull(), // active, blocked, paused
});

export type FounderState = typeof founderState.$inferSelect;
export type NewFounderState = typeof founderState.$inferInsert;
